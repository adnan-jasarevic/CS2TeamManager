import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar as BigCalendar, Views, dateFnsLocalizer, type SlotInfo, type View } from 'react-big-calendar';
import { addDays, endOfMonth, format, getDay, parse, startOfMonth, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLayoutContext } from '../components/layout-context';
import EventModal from '../components/event-modal';
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

const KIND_COLORS: Record<CalendarItem['kind'], string> = {
    Pracc: '#3b82f6',
    OfficialMatch: '#ff6b4a',
    VodReview: '#a855f7',
    Other: '#6b7280',
    Match: '#16a34a',
};

const LEGEND: { kind: CalendarItem['kind']; label: string }[] = [
    { kind: 'Pracc', label: EVENT_TYPE_LABELS.Pracc },
    { kind: 'OfficialMatch', label: EVENT_TYPE_LABELS.OfficialMatch },
    { kind: 'VodReview', label: EVENT_TYPE_LABELS.VodReview },
    { kind: 'Other', label: EVENT_TYPE_LABELS.Other },
    { kind: 'Match', label: 'Recorded match' },
];

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

export default function CalendarPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [events, setEvents] = useState<TeamEvent[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());
    const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { teamsVersion } = useLayoutContext();

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await api.get<Team[]>('/Teams/my-teams');
                setTeams(response.data);
                if (response.data.length > 0) setSelectedTeamId(prev => prev ?? response.data[0].id);
            } catch (err: unknown) {
                setError(getApiErrorMessage(err, 'Failed to load teams.'));
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, [teamsVersion]);

    const { from, to } = useMemo(() => visibleRange(date, view), [date, view]);

    const fetchEvents = useCallback(async () => {
        if (selectedTeamId === null) return;
        try {
            setError('');
            const [eventsResponse, matchesResponse] = await Promise.all([
                api.get<TeamEvent[]>(`/teams/${selectedTeamId}/events`, {
                    params: { from: from.toISOString(), to: to.toISOString() },
                }),
                api.get<Match[]>(`/Matches/${selectedTeamId}`),
            ]);
            setEvents(eventsResponse.data);
            setMatches(matchesResponse.data);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to load the calendar.'));
        }
    }, [selectedTeamId, from, to]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const canManage = canManageTeam(selectedTeam?.currentUserRole);

    const items = useMemo<CalendarItem[]>(() => [
        ...events.map(e => ({
            title: e.title,
            start: new Date(e.startTime),
            end: new Date(e.endTime),
            kind: e.eventType,
            event: e,
        })),
        ...matches
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
    ], [events, matches]);

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

    const handleSelectEvent = (item: CalendarItem) => {
        if (item.event) setModal({ mode: 'open', event: item.event });
    };

    if (loading) return <div className="text-gray-400 p-8">Loading calendar...</div>;

    if (teams.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold text-white mb-2">Calendar</h1>
                <p className="text-gray-400">You need to create or join a team first.</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Calendar</h1>
                    <p className="text-gray-400">
                        Praccs, official matches and VOD reviews.
                        {canManage && ' Click a day or drag over a time range to add an event.'}
                    </p>
                </div>

                <div className="flex items-end gap-4">
                    {canManage && (
                        <button
                            onClick={() => {
                                const start = new Date();
                                start.setMinutes(0, 0, 0);
                                start.setHours(start.getHours() + 1);
                                setModal({ mode: 'create', start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) });
                            }}
                            className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold transition-colors shadow-lg text-white"
                        >
                            + Add Event
                        </button>
                    )}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Select Team:</label>
                        <select
                            className="bg-[#181a2d] border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#ff6b4a]"
                            value={selectedTeamId || ''}
                            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                        >
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.currentUserRole})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">{error}</div>}

            <div className="flex flex-wrap gap-4 mb-4">
                {LEGEND.map(l => (
                    <span key={l.kind} className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: KIND_COLORS[l.kind] }} />
                        {l.label}
                    </span>
                ))}
            </div>

            <div className="team-calendar bg-[#181a2d] rounded-xl border border-gray-800 shadow-md p-4" style={{ height: 720 }}>
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
                    onSelectEvent={handleSelectEvent}
                    scrollToTime={new Date(1970, 0, 1, 12, 0)}
                    popup
                    eventPropGetter={(item) => ({
                        style: {
                            backgroundColor: KIND_COLORS[item.kind],
                            border: 'none',
                            cursor: item.event ? 'pointer' : 'default',
                        },
                    })}
                />
            </div>

            {modal.mode !== 'closed' && selectedTeamId !== null && (
                <EventModal
                    teamId={selectedTeamId}
                    event={modal.mode === 'open' ? modal.event : null}
                    initialStart={modal.mode === 'create' ? modal.start : undefined}
                    initialEnd={modal.mode === 'create' ? modal.end : undefined}
                    canManage={canManage}
                    onClose={() => setModal({ mode: 'closed' })}
                    onSaved={fetchEvents}
                />
            )}
        </div>
    );
}
