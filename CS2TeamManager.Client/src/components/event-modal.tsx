import { useState } from 'react';
import { format } from 'date-fns';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { EVENT_TYPE_LABELS, TeamEventType, type SaveTeamEventRequest, type TeamEvent, type TeamEventTypeValue } from '../types';

interface EventModalProps {
    teamId: number;
    // An existing event to view or edit; null to create a new one.
    event: TeamEvent | null;
    // Prefilled times when creating from a calendar selection.
    initialStart?: Date;
    initialEnd?: Date;
    canManage: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const inputClass = 'w-full px-4 py-2 bg-[#111322] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b4a] disabled:opacity-60';
const labelClass = 'block text-gray-400 text-sm mb-1';

// datetime-local wants "yyyy-MM-ddTHH:mm" in the user's local time.
const toInputValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

const TYPE_OPTIONS = Object.entries(TeamEventType) as [keyof typeof TeamEventType, TeamEventTypeValue][];

export default function EventModal({ teamId, event, initialStart, initialEnd, canManage, onClose, onSaved }: EventModalProps) {
    const defaultStart = initialStart ?? new Date();
    const defaultEnd = initialEnd ?? new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [eventType, setEventType] = useState<TeamEventTypeValue>(
        event ? TeamEventType[event.eventType as keyof typeof TeamEventType] : TeamEventType.Pracc,
    );
    const [start, setStart] = useState(toInputValue(event ? new Date(event.startTime) : defaultStart));
    const [end, setEnd] = useState(toInputValue(event ? new Date(event.endTime) : defaultEnd));
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const readOnly = !canManage;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (readOnly) return;
        setError('');

        if (!title.trim() || !start || !end) {
            setError('Title, start and end are required.');
            return;
        }

        const payload: SaveTeamEventRequest = {
            title: title.trim(),
            description: description.trim() || undefined,
            // new Date() reads the datetime-local value as local time; toISOString() sends UTC.
            startTime: new Date(start).toISOString(),
            endTime: new Date(end).toISOString(),
            eventType,
        };

        setIsSubmitting(true);
        try {
            if (event) await api.put(`/teams/${teamId}/events/${event.id}`, payload);
            else await api.post(`/teams/${teamId}/events`, payload);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to save the event.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/teams/${teamId}/events/${event.id}`);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to delete the event.'));
            setIsSubmitting(false);
        }
    };

    const heading = readOnly ? 'Event' : event ? 'Edit Event' : 'New Event';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{heading}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded text-sm">{error}</div>}

                    <div>
                        <label className={labelClass}>Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Pracc vs Team Liquid"
                            maxLength={100}
                            disabled={readOnly}
                            autoFocus={!readOnly}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Type</label>
                        <div className="flex flex-wrap gap-2">
                            {TYPE_OPTIONS.map(([key, value]) => (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => setEventType(value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors disabled:cursor-default ${eventType === value
                                        ? 'bg-[#ff6b4a] border-[#ff6b4a] text-white'
                                        : 'bg-[#111322] border-gray-700 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {EVENT_TYPE_LABELS[key]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Starts</label>
                            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} disabled={readOnly} />
                        </div>
                        <div>
                            <label className={labelClass}>Ends</label>
                            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} disabled={readOnly} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`${inputClass} resize-none`}
                            rows={3}
                            maxLength={1000}
                            disabled={readOnly}
                        />
                    </div>

                    {!readOnly && (
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div>
                                {event && !confirmDelete && (
                                    <button type="button" onClick={() => setConfirmDelete(true)} className="text-red-400 hover:text-red-300 text-sm">
                                        Delete event
                                    </button>
                                )}
                                {event && confirmDelete && (
                                    <button type="button" onClick={handleDelete} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50">
                                        Confirm delete
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !title.trim()}
                                    className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : event ? 'Save' : 'Add Event'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
