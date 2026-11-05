import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { EVENT_TYPE_LABELS, TeamEventType, type SaveTeamEventRequest, type TeamEvent, type TeamEventTypeValue } from '../types';
import { Alert, Button, ConfirmDialog, Field, Input, Modal, SegmentedControl, Textarea } from './ui';

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

// datetime-local wants "yyyy-MM-ddTHH:mm" in the user's local time.
const toInputValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

const TYPE_OPTIONS = (Object.entries(TeamEventType) as [keyof typeof TeamEventType, TeamEventTypeValue][])
    .map(([key, value]) => ({ value, label: EVENT_TYPE_LABELS[key] }));

export default function EventModal({ teamId, event, initialStart, initialEnd, canManage, onClose, onSaved }: EventModalProps) {
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [eventType, setEventType] = useState<TeamEventTypeValue>(
        event ? TeamEventType[event.eventType as keyof typeof TeamEventType] : TeamEventType.Pracc,
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
            eventType,
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

                <SegmentedControl label="Type" value={eventType} options={TYPE_OPTIONS} onChange={setEventType} disabled={readOnly} />

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
