import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { CalendarOff, Trash2 } from 'lucide-react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { otherTypeOf, pickableTypes } from '../lib/event-types';
import type { SaveTeamEventRequest, TeamEvent, TeamEventType } from '../types';
import { Alert, Button, ConfirmDialog, Field, Input, Modal, SegmentedControl, Textarea } from './ui';

interface EventModalProps {
    teamId: number;
    // An existing event to view or edit; null to create a new one.
    event: TeamEvent | null;
    // Prefilled times when creating from a calendar selection.
    initialStart?: Date;
    initialEnd?: Date;
    // The team's event types, "Other" last.
    types: TeamEventType[];
    // True when the event sits on an off day, which makes it cancelled.
    onOffDay?: boolean;
    canManage: boolean;
    onClose: () => void;
    onSaved: () => void;
    // Offered instead of a new event: marks the day of the selected start as an off day.
    onMarkOffDay?: (day: Date) => void;
}

// datetime-local wants "yyyy-MM-ddTHH:mm" in the user's local time.
const toInputValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

// The type a new event starts with: Pracc when the team has it, otherwise the first type on the list.
const defaultTypeId = (types: TeamEventType[]) =>
    (types.find(t => t.preset === 'Pracc') ?? pickableTypes(types)[0] ?? otherTypeOf(types))?.id ?? 0;

export default function EventModal({ teamId, event, initialStart, initialEnd, types, onOffDay = false, canManage, onClose, onSaved, onMarkOffDay }: EventModalProps) {
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    // An event whose type was removed a moment ago is under Other by now.
    const [eventTypeId, setEventTypeId] = useState(() =>
        event && types.some(t => t.id === event.eventTypeId) ? event.eventTypeId : event ? otherTypeOf(types)?.id ?? 0 : defaultTypeId(types),
    );
    const [start, setStart] = useState(() => toInputValue(event ? new Date(event.startTime) : initialStart ?? new Date()));
    const [end, setEnd] = useState(() => {
        if (event) return toInputValue(new Date(event.endTime));
        const defaultStart = initialStart ?? new Date();
        return toInputValue(initialEnd ?? new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000));
    });
    const [error, setError] = useState('');
    const [showFieldErrors, setShowFieldErrors] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const readOnly = !canManage;
    const titleError = showFieldErrors && !title.trim() ? 'Give the event a title.' : undefined;
    const startError = showFieldErrors && !start ? 'Pick a start time.' : undefined;
    const endError = showFieldErrors && !end
        ? 'Pick an end time.'
        : start && end && new Date(end) <= new Date(start) ? 'The end has to be after the start.' : undefined;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (readOnly) return;
        setError('');

        if (!title.trim() || !start || !end || endError) {
            setShowFieldErrors(true);
            return;
        }

        const payload: SaveTeamEventRequest = {
            title: title.trim(),
            description: description.trim() || undefined,
            // new Date() reads the datetime-local value as local time; toISOString() sends UTC.
            startTime: new Date(start).toISOString(),
            endTime: new Date(end).toISOString(),
            eventTypeId,
        };

        setIsSubmitting(true);
        try {
            if (event) await api.put(`/teams/${teamId}/events/${event.id}`, { ...payload, version: event.version });
            else await api.post(`/teams/${teamId}/events`, payload);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to save the event.'));
            // Someone else saved a newer version, or deleted the event: refresh the calendar behind the dialog
            // so reopening the event shows what is there now. The dialog stays open so nothing typed is lost.
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status === 409 || status === 404) onSaved();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;
        setDeleteError('');
        setIsDeleting(true);
        try {
            await api.delete(`/teams/${teamId}/events/${event.id}`);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setDeleteError(getApiErrorMessage(err, 'Failed to delete the event.'));
            setIsDeleting(false);
        }
    };

    const heading = readOnly ? 'Event' : event ? 'Edit event' : 'New event';

    const typeOptions = types
        .filter(t => t.preset !== 'RecordedMatch' || t.id === eventTypeId)
        .map(t => ({
            value: t.id,
            label: (
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 shrink-0 rounded-full ring-1 ring-line-strong" style={{ backgroundColor: t.color }} aria-hidden="true" />
                    {t.name}
                </span>
            ),
        }));

    return (
        <Modal
            open
            onClose={onClose}
            title={heading}
            busy={isSubmitting || isDeleting}
            closeOnBackdrop={readOnly}
            footer={readOnly ? (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            ) : (
                <>
                    {!event && onMarkOffDay && (
                        <Button
                            variant="ghost"
                            className="mr-auto"
                            onClick={() => onMarkOffDay(new Date(start || Date.now()))}
                            disabled={isSubmitting}
                            leftIcon={<CalendarOff className="size-4" aria-hidden="true" />}
                        >
                            Make it an off day
                        </Button>
                    )}
                    {event && (
                        <Button
                            variant="ghost"
                            className="mr-auto text-danger hover:text-danger"
                            onClick={() => { setDeleteError(''); setIsConfirmingDelete(true); }}
                            disabled={isSubmitting}
                            leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                        >
                            Delete
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" form="event-form" loading={isSubmitting} loadingText="Saving...">{event ? 'Save' : 'Add event'}</Button>
                </>
            )}
        >
            <form id="event-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {error && <Alert tone="danger">{error}</Alert>}
                {onOffDay && (
                    <Alert tone="warning">
                        This day is an off day, so the event is cancelled. It comes back if the day stops being an off day.
                    </Alert>
                )}

                <Field label="Title" required={!readOnly} error={titleError}>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Pracc vs Tokyo Ronin"
                        maxLength={100}
                        disabled={readOnly}
                        autoComplete="off"
                        data-autofocus={readOnly ? undefined : true}
                    />
                </Field>

                <SegmentedControl label="Type" value={eventTypeId} options={typeOptions} onChange={setEventTypeId} disabled={readOnly} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Starts" required={!readOnly} error={startError}>
                        <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={readOnly} />
                    </Field>
                    <Field label="Ends" required={!readOnly} error={endError}>
                        <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} disabled={readOnly} />
                    </Field>
                </div>

                <Field label="Description" optional={!readOnly}>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} disabled={readOnly} />
                </Field>
            </form>

            <ConfirmDialog
                open={isConfirmingDelete}
                onClose={() => setIsConfirmingDelete(false)}
                onConfirm={handleDelete}
                title="Delete event"
                confirmLabel="Delete event"
                busyLabel="Deleting..."
                busy={isDeleting}
                error={deleteError}
            >
                Delete <strong className="text-fg">{event?.title}</strong>? This can't be undone.
            </ConfirmDialog>
        </Modal>
    );
}
