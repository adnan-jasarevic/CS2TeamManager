import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { Calendar as BigCalendar, Views, dateFnsLocalizer, type Components, type EventProps, type SlotInfo, type View } from 'react-big-calendar';
import { addDays, endOfMonth, format, getDay, parse, startOfMonth, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarPlus, Circle, Clapperboard, Crosshair, Swords, Trophy, type LucideIcon } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import api from '../services/api';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import { cx } from '../lib/cx';
import EventModal from '../components/event-modal';
import PageHeader, { PageContainer } from '../components/page-header';
import TeamGate from '../components/team-gate';
import { Alert, Button, Card, ErrorState, Skeleton } from '../components/ui';
import { EVENT_TYPE_LABELS, type Match, type Team, type TeamEvent, canManageTeam } from '../types';

// Weeks start on Monday.
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales: { 'en-US': enUS },
});

// A recorded match lasts about this long on the calendar.
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

interface CalendarItem {
    title: string;
    start: Date;
    end: Date;
    kind: TeamEvent['eventType'] | 'Match';
    event?: TeamEvent;
}

// Every kind has its own icon as well as a colour, so kinds can be told apart without seeing colour.
const KINDS: Record<CalendarItem['kind'], { label: string; icon: LucideIcon; cssKey: string }> = {
    Pracc: { label: EVENT_TYPE_LABELS.Pracc, icon: Crosshair, cssKey: 'pracc' },
    OfficialMatch: { label: EVENT_TYPE_LABELS.OfficialMatch, icon: Trophy, cssKey: 'official' },
    VodReview: { label: EVENT_TYPE_LABELS.VodReview, icon: Clapperboard, cssKey: 'vod' },
    Other: { label: EVENT_TYPE_LABELS.Other, icon: Circle, cssKey: 'other' },
    Match: { label: 'Recorded match', icon: Swords, cssKey: 'match' },
};

// The range a view shows, padded so month view's leading and trailing days are included.
const visibleRange = (date: Date, view: View) => {
    if (view === Views.MONTH) {
        return {
            from: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
            to: addDays(startOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 7),
        };
    }
    if (view === Views.WEEK) {
        const from = startOfWeek(date, { weekStartsOn: 1 });
        return { from, to: addDays(from, 7) };
    }
    if (view === Views.AGENDA) return { from: date, to: addDays(date, 30) };
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return { from, to: addDays(from, 1) };
};

type ModalState =
    | { mode: 'closed' }
    | { mode: 'create'; start: Date; end: Date }
    | { mode: 'open'; event: TeamEvent };

interface CalendarData {
    events: TeamEvent[];
    matches: Match[];
}

// A month grid is unreadable on a phone, so small screens start on the agenda list.
const initialView = (): View => (window.matchMedia('(max-width: 639px)').matches ? Views.AGENDA : Views.MONTH);

export default function CalendarPage() {
    return (
        <TeamGate title="Calendar">
            {team => <CalendarContent key={team.id} team={team} />}
        </TeamGate>
    );
}

function CalendarContent({ team }: { team: Team }) {
    const [view, setView] = useState<View>(initialView);
    const [date, setDate] = useState(() => new Date());
    const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
    const canManage = canManageTeam(team.currentUserRole);

    const { from, to } = useMemo(() => visibleRange(date, view), [date, view]);

    const load = useCallback<ResourceLoader<CalendarData>>(async signal => {
        const [events, matches] = await Promise.all([
            api.get<TeamEvent[]>(`/teams/${team.id}/events`, { signal, params: { from: from.toISOString(), to: to.toISOString() } }),
            api.get<Match[]>(`/Matches/${team.id}`, { signal }),
        ]);
        return { events: events.data, matches: matches.data };
    }, [team.id, from, to]);

    // Keeps the current events on screen while the next month loads, instead of blanking the grid.
    const { data, error, isLoading, isFetching, reload } = useResource(load, 'Failed to load the calendar.', { keepPrevious: true });

    const items = useMemo<CalendarItem[]>(() => [
        ...(data?.events ?? []).map(e => ({
            title: e.title,
            start: new Date(e.startTime),
            end: new Date(e.endTime),
            kind: e.eventType,
            event: e,
        })),
        ...(data?.matches ?? [])
            .filter(m => m.status !== 'Cancelled')
            .map(m => {
                const start = new Date(m.scheduledDate);
                const score = m.status === 'Finished' ? ` (${m.finalScore})` : '';
                return {
                    title: `vs ${m.opponentName}${score}`,
                    start,
                    end: new Date(start.getTime() + MATCH_DURATION_MS),
                    kind: 'Match' as const,
                };
            }),
    ], [data]);

    const handleSelectSlot = (slot: SlotInfo) => {
        if (!canManage) return;
        let { start, end } = slot;
        // A click on a month cell selects the whole day; start an evening session instead.
        if (view === Views.MONTH) {
            start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 19, 0);
            end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        }
        setModal({ mode: 'create', start, end });
    };

    const openNewEvent = () => {
        const start = new Date();
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() + 1);
        setModal({ mode: 'create', start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) });
    };

    const components = useMemo<Components<CalendarItem>>(() => ({
        // Week and day views already make each event a focusable button, so it only needs a label.
        event: CalendarEventChip,
        // Month view events can't be reached by keyboard. A real button inside each one can, and its
        // click bubbles up to onSelectEvent. The events sit in a role="row", which may only hold cells.
        month: { event: MonthEventChip },
        // The agenda view has no onSelectEvent of its own, so its button opens the event directly.
        agenda: {
            event: ({ event: item }: EventProps<CalendarItem>) => (
                <EventLabel item={item} onOpen={item.event ? () => setModal({ mode: 'open', event: item.event! }) : undefined} />
            ),
        },
    }), []);

    return (
        <PageContainer>
            <PageHeader
                title="Calendar"
                description={<>Praccs, official matches and VOD reviews.{canManage && <span className="max-sm:hidden"> Click a day or drag over a time range to add an event.</span>}</>}
                actions={canManage && (
                    <Button onClick={openNewEvent} leftIcon={<CalendarPlus className="size-4" aria-hidden="true" />}>Add event</Button>
                )}
            />

            {error && data && <Alert tone="danger" className="mb-4">{error}</Alert>}

            <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Event types">
                {Object.entries(KINDS).map(([kind, { label, icon: Icon, cssKey }]) => (
                    <li key={kind} className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                        <span className="flex size-5 items-center justify-center rounded" style={{ backgroundColor: `var(--rs-event-${cssKey})`, color: `var(--rs-event-${cssKey}-fg)` }}>
                            <Icon className="size-3" aria-hidden="true" />
                        </span>
                        {label}
                    </li>
                ))}
            </ul>

            <Card className={cx('team-calendar h-[75dvh] min-h-[560px] overflow-hidden p-2 sm:p-4', isFetching && 'is-refreshing')} aria-busy={isFetching} aria-label="Team calendar">
                {isLoading ? (
                    <div role="status" className="flex h-full flex-col gap-4">
                        <span className="sr-only">Loading calendar</span>
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="w-full flex-1" />
                    </div>
                ) : error && !data ? (
                    <ErrorState title="Couldn't load the calendar" message={error} onRetry={reload} retrying={isFetching} />
                ) : (
                    <BigCalendar<CalendarItem>
                        localizer={localizer}
                        culture="en-US"
                        events={items}
                        view={view}
                        onView={setView}
                        date={date}
                        onNavigate={setDate}
                        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                        selectable={canManage}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={item => { if (item.event) setModal({ mode: 'open', event: item.event }); }}
                        onKeyPressEvent={(item, keyEvent) => {
                            const { key } = keyEvent as unknown as KeyboardEvent;
                            if (!item.event || (key !== 'Enter' && key !== ' ')) return;
                            // Without this, the same key press lands in the dialog's form and submits it.
                            keyEvent.preventDefault();
                            setModal({ mode: 'open', event: item.event });
                        }}
                        scrollToTime={new Date(1970, 0, 1, 12, 0)}
                        popup
                        components={components}
                        tooltipAccessor={item => `${KINDS[item.kind].label}: ${item.title}`}
                        eventPropGetter={item => ({ className: cx(`rbc-kind-${KINDS[item.kind].cssKey}`, !item.event && 'is-readonly') })}
                    />
                )}
            </Card>

            {modal.mode !== 'closed' && (
                <EventModal
                    teamId={team.id}
                    event={modal.mode === 'open' ? modal.event : null}
                    initialStart={modal.mode === 'create' ? modal.start : undefined}
                    initialEnd={modal.mode === 'create' ? modal.end : undefined}
                    canManage={canManage}
                    onClose={() => setModal({ mode: 'closed' })}
                    onSaved={reload}
                />
            )}
        </PageContainer>
    );
}

function CalendarEventChip({ event: item }: EventProps<CalendarItem>) {
    return <EventLabel item={item} />;
}

function MonthEventChip({ event: item }: EventProps<CalendarItem>) {
    return <div role="cell"><EventLabel item={item} clickable={Boolean(item.event)} /></div>;
}

interface EventLabelProps {
    item: CalendarItem;
    /** Renders a focusable button whose click bubbles up to the calendar. */
    clickable?: boolean;
    /** Renders a button that handles the click itself. */
    onOpen?: () => void;
}

function EventLabel({ item, clickable = false, onOpen }: EventLabelProps) {
    const { icon: Icon, label } = KINDS[item.kind];
    const content = (
        <>
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">{label}: </span>
            <span className="truncate">{item.title}</span>
        </>
    );

    if (clickable || onOpen) {
        return <button type="button" onClick={onOpen} className="rs-event-label">{content}</button>;
    }
    return <span className="rs-event-label">{content}</span>;
}
