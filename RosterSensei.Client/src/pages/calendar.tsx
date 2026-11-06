import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Calendar as BigCalendar, Views, dateFnsLocalizer, type Components, type EventProps, type SlotInfo, type View } from 'react-big-calendar';
import { addDays, endOfMonth, format, getDay, parse, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarOff, CalendarPlus, Tags } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import api from '../services/api';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import { cx } from '../lib/cx';
import EventModal from '../components/event-modal';
import EventTypesModal from '../components/event-types-modal';
import { EventTypeIcon, otherTypeOf, textColorFor } from '../lib/event-types';
import { getApiErrorMessage } from '../services/errors';
import PageHeader, { PageContainer } from '../components/page-header';
import TeamGate from '../components/team-gate';
import { Alert, Button, Card, ErrorState, Modal, Skeleton, useToast } from '../components/ui';
import { type Match, type Team, type TeamEvent, type TeamEventType, type TeamEventTypes, type TeamOffDay, canManageTeam } from '../types';

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
    type: TeamEventType;
    /** The event to open when the item is clicked. A recorded match has one only when it replaced an event. */
    event?: TeamEvent;
    /** The event sits on an off day. */
    cancelled: boolean;
}

// Events of these premade types are replaced by a recorded match that starts during them.
const REPLACED_BY_RECORDED_MATCH = new Set(['Scrim', 'OfficialMatch']);

// Off days are stored by the date their creator saw; this is the same "yyyy-MM-dd" key in local time.
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

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
    | { mode: 'open'; event: TeamEvent; cancelled: boolean }
    | { mode: 'offDay'; day: Date }
    | { mode: 'types' };

interface CalendarData {
    events: TeamEvent[];
    matches: Match[];
    eventTypes: TeamEventTypes;
    offDays: TeamOffDay[];
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
    const toast = useToast();
    const canManage = canManageTeam(team);

    const { from, to } = useMemo(() => visibleRange(date, view), [date, view]);

    const load = useCallback<ResourceLoader<CalendarData>>(async signal => {
        const range = { from: from.toISOString(), to: to.toISOString() };
        const [events, matches, eventTypes, offDays] = await Promise.all([
            api.get<TeamEvent[]>(`/teams/${team.id}/events`, { signal, params: range }),
            api.get<Match[]>(`/Matches/${team.id}`, { signal }),
            api.get<TeamEventTypes>(`/teams/${team.id}/event-types`, { signal }),
            api.get<TeamOffDay[]>(`/teams/${team.id}/off-days`, { signal, params: range }),
        ]);
        return { events: events.data, matches: matches.data, eventTypes: eventTypes.data, offDays: offDays.data };
    }, [team.id, from, to]);

    // Keeps the current events on screen while the next month loads, instead of blanking the grid.
    const { data, error, isLoading, isFetching, reload } = useResource(load, 'Failed to load the calendar.', { keepPrevious: true });

    const types = useMemo(() => data?.eventTypes.types ?? [], [data]);
    const offDayKeys = useMemo(() => new Set((data?.offDays ?? []).map(d => d.date)), [data]);

    const items = useMemo<CalendarItem[]>(() => {
        if (!data || types.length === 0) return [];
        const byId = new Map(types.map(t => [t.id, t]));
        const other = otherTypeOf(types);
        const offRanges = data.offDays.map(d => ({ start: new Date(d.startTime), end: new Date(d.endTime) }));
        const onOffDay = (start: Date, end: Date) => offRanges.some(r => r.start < end && r.end > start);

        // Recorded matches only show while the team has the Recorded Match type.
        const recordedType = types.find(t => t.preset === 'RecordedMatch');
        const matches = recordedType ? data.matches.filter(m => m.status !== 'Cancelled') : [];

        // A recorded match that starts during a Scrim or Official Match event takes that event's place.
        const replacedBy = new Map<number, Match>();
        for (const e of data.events) {
            const preset = byId.get(e.eventTypeId)?.preset;
            if (!preset || !REPLACED_BY_RECORDED_MATCH.has(preset)) continue;
            const start = new Date(e.startTime).getTime();
            const end = new Date(e.endTime).getTime();
            const match = matches.find(m => {
                const at = new Date(m.scheduledDate).getTime();
                return at >= start && at < end;
            });
            if (match) replacedBy.set(e.id, match);
        }

        const eventItems = data.events
            .filter(e => !replacedBy.has(e.id))
            .map(e => {
                const start = new Date(e.startTime);
                const end = new Date(e.endTime);
                return { title: e.title, start, end, type: byId.get(e.eventTypeId) ?? other, event: e, cancelled: onOffDay(start, end) };
            });

        const matchItems = matches.map(m => {
            const start = new Date(m.scheduledDate);
            const score = m.status === 'Finished' ? ` (${m.finalScore})` : '';
            // Opening the match opens the event it replaced, so that event can still be edited or deleted.
            const replaced = data.events.find(e => replacedBy.get(e.id) === m);
            return {
                title: `vs ${m.opponentName}${score}`,
                start,
                end: new Date(start.getTime() + MATCH_DURATION_MS),
                type: recordedType!,
                event: replaced,
                cancelled: false,
            };
        });

        return [...eventItems, ...matchItems];
    }, [data, types]);

    const openItem = useCallback((item: CalendarItem) => {
        if (item.event) setModal({ mode: 'open', event: item.event, cancelled: item.cancelled });
    }, []);

    const markOffDay = async (day: Date) => {
        const start = startOfDay(day);
        try {
            await api.put(`/teams/${team.id}/off-days/${dayKey(start)}`, {
                startTime: start.toISOString(),
                endTime: addDays(start, 1).toISOString(),
            });
            toast.success(`${format(start, 'EEEE d MMMM')} is now an off day.`);
            setModal({ mode: 'closed' });
            reload();
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to mark the off day.'));
        }
    };

    const handleSelectSlot = (slot: SlotInfo) => {
        if (!canManage) return;
        let { start, end } = slot;
        if (offDayKeys.has(dayKey(start))) {
            setModal({ mode: 'offDay', day: start });
            return;
        }
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
        // Month view events can't be reached by keyboard. A real button inside each one can, and its
        // click bubbles up to onSelectEvent. The events sit in a role="row", which may only hold cells.
        month: {
            event: MonthEventChip,
            dateHeader: props => (
                <MonthDateHeader
                    {...props}
                    isOffDay={offDayKeys.has(dayKey(props.date))}
                    onOpenOffDay={canManage ? () => setModal({ mode: 'offDay', day: props.date }) : undefined}
                />
            ),
        },
        // The library's day headers carry role="columnheader" with no table around them.
        week: { header: DayHeader, event: TimeGridEventChip },
        day: { header: DayHeader, event: TimeGridEventChip },
        // The agenda view has no onSelectEvent of its own, so its button opens the event directly.
        agenda: {
            event: ({ event: item }: EventProps<CalendarItem>) => (
                <EventLabel item={item} onOpen={item.event ? () => openItem(item) : undefined} />
            ),
        },
    }), [offDayKeys, canManage, openItem]);

    return (
        <PageContainer>
            <PageHeader
                title="Calendar"
                description={<>Your team's schedule.{canManage && <span className="max-sm:hidden"> Click a day or drag over a time range to add an event or mark an off day.</span>}</>}
                actions={canManage && (
                    <>
                        <Button variant="secondary" onClick={() => setModal({ mode: 'types' })} disabled={!data} leftIcon={<Tags className="size-4" aria-hidden="true" />}>Event types</Button>
                        <Button onClick={openNewEvent} disabled={!data} leftIcon={<CalendarPlus className="size-4" aria-hidden="true" />}>Add event</Button>
                    </>
                )}
            />

            {error && data && <Alert tone="danger" className="mb-4">{error}</Alert>}

            <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Event types">
                {types.map(type => {
                    return (
                        <li key={type.id} className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                            <span className="flex size-5 items-center justify-center rounded" style={{ backgroundColor: type.color, color: textColorFor(type.color) }}>
                                <EventTypeIcon type={type} className="size-3" />
                            </span>
                            {type.name}
                        </li>
                    );
                })}
                {data && (
                    <li className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                        <span className="rs-off-day-swatch flex size-5 items-center justify-center rounded border border-line">
                            <CalendarOff className="size-3" aria-hidden="true" />
                        </span>
                        Off day
                    </li>
                )}
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
                    <TimeGridA11yFix>
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
                        onSelectEvent={openItem}
                        onKeyPressEvent={(item, keyEvent) => {
                            const { key } = keyEvent as unknown as KeyboardEvent;
                            if (!item.event || (key !== 'Enter' && key !== ' ')) return;
                            // Without this, the same key press lands in the dialog's form and submits it.
                            keyEvent.preventDefault();
                            openItem(item);
                        }}
                        scrollToTime={new Date(1970, 0, 1, 12, 0)}
                        popup
                        components={components}
                        tooltipAccessor={item => `${item.type.name}: ${item.title}${item.cancelled ? ' (cancelled, off day)' : ''}`}
                        eventPropGetter={item => ({
                            className: cx(!item.event && 'is-readonly', item.cancelled && 'is-cancelled'),
                            style: { backgroundColor: item.type.color, color: textColorFor(item.type.color) },
                        })}
                        dayPropGetter={day => (offDayKeys.has(dayKey(day)) ? { className: 'is-off-day' } : {})}
                    />
                    </TimeGridA11yFix>
                )}
            </Card>

            {(modal.mode === 'create' || modal.mode === 'open') && (
                <EventModal
                    teamId={team.id}
                    event={modal.mode === 'open' ? modal.event : null}
                    initialStart={modal.mode === 'create' ? modal.start : undefined}
                    initialEnd={modal.mode === 'create' ? modal.end : undefined}
                    types={types}
                    onOffDay={modal.mode === 'open' && modal.cancelled}
                    canManage={canManage}
                    onClose={() => setModal({ mode: 'closed' })}
                    onSaved={reload}
                    onMarkOffDay={canManage ? markOffDay : undefined}
                />
            )}

            {modal.mode === 'offDay' && (
                <OffDayDialog
                    teamId={team.id}
                    day={modal.day}
                    cancelledCount={items.filter(i => i.cancelled && i.event && dayKey(i.start) <= dayKey(modal.day) && dayKey(i.end) >= dayKey(modal.day)).length}
                    onClose={() => setModal({ mode: 'closed' })}
                    onChanged={reload}
                />
            )}

            {modal.mode === 'types' && data && (
                <EventTypesModal
                    teamId={team.id}
                    eventTypes={data.eventTypes}
                    onClose={() => setModal({ mode: 'closed' })}
                    onChanged={reload}
                />
            )}
        </PageContainer>
    );
}

function MonthEventChip({ event: item }: EventProps<CalendarItem>) {
    return <div role="cell"><EventLabel item={item} clickable={Boolean(item.event)} /></div>;
}

// Week and day views use one event component in two places. Timed events are already focusable
// buttons, so they only need a label. Multi-day events sit in the all-day row, where the library
// renders a plain div, so they get a real button like month view. Only the all-day row passes slotStart.
function TimeGridEventChip(props: EventProps<CalendarItem>) {
    const inAllDayRow = (props as EventProps<CalendarItem> & { slotStart?: Date }).slotStart !== undefined;
    return <EventLabel item={props.event} clickable={inAllDayRow && Boolean(props.event.event)} />;
}

function DayHeader({ label }: { label: ReactNode }) {
    return <span>{label}</span>;
}

// Fixes markup the library renders itself, so it is done after each render rather than through props.
// - In week and day views the all-day row has role="rowgroup" and role="row" with no table around it,
//   and the row has no cells when it is empty. It is just a strip of events, so those roles are removed.
// - The scrolling time grid has nothing focusable when a week has no timed events, so keyboard users
//   couldn't scroll it. It becomes a focusable, labelled region.
function TimeGridA11yFix({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = ref.current;
        if (!root) return;

        const fix = () => {
            root.querySelectorAll('.rbc-time-header [role="rowgroup"], .rbc-time-header [role="row"]')
                .forEach(element => element.removeAttribute('role'));
            root.querySelectorAll<HTMLElement>('.rbc-time-content:not([tabindex])').forEach(element => {
                element.tabIndex = 0;
                element.setAttribute('role', 'region');
                element.setAttribute('aria-label', 'Time slots');
            });
        };

        fix();
        // Only child changes are observed, so changing attributes doesn't trigger the observer again.
        const observer = new MutationObserver(fix);
        observer.observe(root, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    return <div ref={ref} className="h-full">{children}</div>;
}

interface EventLabelProps {
    item: CalendarItem;
    /** Renders a focusable button whose click bubbles up to the calendar. */
    clickable?: boolean;
    /** Renders a button that handles the click itself. */
    onOpen?: () => void;
}

function EventLabel({ item, clickable = false, onOpen }: EventLabelProps) {
    const content = (
        <>
            <EventTypeIcon type={item.type} className="size-3 shrink-0" />
            <span className="sr-only">{item.cancelled ? `Cancelled ${item.type.name}` : item.type.name}: </span>
            <span className="truncate">{item.title}</span>
        </>
    );

    if (clickable || onOpen) {
        return <button type="button" onClick={onOpen} className="rs-event-label">{content}</button>;
    }
    return <span className="rs-event-label">{content}</span>;
}

interface MonthDateHeaderProps {
    date: Date;
    label: string;
    drilldownView: string;
    onDrillDown: () => void;
    isOffDay: boolean;
    /** Opens the off day dialog; only for people who can change off days. */
    onOpenOffDay?: () => void;
}

// The library's own date header, plus an "Off day" tag. For managers the tag is a button, so an off day
// can be cleared by keyboard as well as by clicking the day.
function MonthDateHeader({ label, drilldownView, onDrillDown, isOffDay, onOpenOffDay }: MonthDateHeaderProps) {
    return (
        <span className="flex items-center justify-end gap-1">
            {isOffDay && (onOpenOffDay ? (
                <button type="button" className="rs-off-day-tag" onClick={onOpenOffDay}>Off day</button>
            ) : (
                <span className="rs-off-day-tag">Off day</span>
            ))}
            {drilldownView ? (
                <button type="button" className="rbc-button-link" onClick={onDrillDown}>{label}</button>
            ) : (
                <span>{label}</span>
            )}
        </span>
    );
}

interface OffDayDialogProps {
    teamId: number;
    day: Date;
    cancelledCount: number;
    onClose: () => void;
    onChanged: () => void;
}

function OffDayDialog({ teamId, day, cancelledCount, onClose, onChanged }: OffDayDialogProps) {
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const label = format(day, 'EEEE d MMMM');

    const unmark = async () => {
        setError('');
        setIsSaving(true);
        try {
            await api.delete(`/teams/${teamId}/off-days/${dayKey(day)}`);
            toast.success(`${label} is a normal day again.`);
            onChanged();
            onClose();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to change the off day.'));
            onChanged();
            setIsSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Off day"
            size="sm"
            busy={isSaving}
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Keep it off</Button>
                    <Button onClick={unmark} loading={isSaving} loadingText="Saving...">Make it a normal day</Button>
                </>
            )}
        >
            <div className="flex flex-col gap-3 text-sm text-fg-muted">
                {error && <Alert tone="danger">{error}</Alert>}
                <p><strong className="text-fg">{label}</strong> is an off day. No events can be added to it.</p>
                {cancelledCount > 0 && (
                    <p>{cancelledCount === 1 ? '1 event on it shows' : `${cancelledCount} events on it show`} as cancelled. Making it a normal day brings {cancelledCount === 1 ? 'it' : 'them'} back.</p>
                )}
            </div>
        </Modal>
    );
}
