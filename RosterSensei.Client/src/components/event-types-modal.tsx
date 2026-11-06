import { useState, type FormEvent } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { EventTypeIcon, textColorFor } from '../lib/event-types';
import type { EventTypePresetOption, SaveEventTypeRequest, TeamEventType, TeamEventTypes } from '../types';
import { Alert, Button, ConfirmDialog, Field, IconButton, Input, Modal, useToast } from './ui';

interface EventTypesModalProps {
    teamId: number;
    eventTypes: TeamEventTypes;
    onClose: () => void;
    /** Something changed: reload the calendar, which passes the new list back in. */
    onChanged: () => void;
}

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DEFAULT_CUSTOM_COLOR = '#64748B';

export default function EventTypesModal({ teamId, eventTypes, onClose, onChanged }: EventTypesModalProps) {
    const toast = useToast();
    const [error, setError] = useState('');
    // One request at a time, so two clicks can't race each other.
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<TeamEventType | 'all' | null>(null);
    const [removeError, setRemoveError] = useState('');

    const run = async (key: string, request: () => Promise<unknown>, success?: string) => {
        setError('');
        setBusyKey(key);
        try {
            await request();
            if (success) toast.success(success);
            onChanged();
            return true;
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to update the event types.'));
            // The list may be out of date (someone else changed it), so refresh it either way.
            onChanged();
            return false;
        } finally {
            setBusyKey(null);
        }
    };

    const addPreset = (preset: EventTypePresetOption) =>
        run(`preset-${preset.preset}`, () => api.post(`/teams/${teamId}/event-types/presets/${preset.preset}`));

    const confirmRemoval = async () => {
        if (!pendingRemoval) return;
        setRemoveError('');
        setBusyKey('remove');
        try {
            const response = pendingRemoval === 'all'
                ? await api.delete<{ message: string }>(`/teams/${teamId}/event-types`)
                : await api.delete<{ message: string }>(`/teams/${teamId}/event-types/${pendingRemoval.id}`);
            toast.success(response.data.message);
            setPendingRemoval(null);
            onChanged();
        } catch (err: unknown) {
            setRemoveError(getApiErrorMessage(err, 'Failed to remove the event type.'));
            onChanged();
        } finally {
            setBusyKey(null);
        }
    };

    const removableCount = eventTypes.types.filter(t => !t.isLocked).length;

    return (
        <Modal
            open
            onClose={onClose}
            title="Event types"
            description="Pick the types your team uses. Removing a type keeps its events and moves them to Other."
            size="lg"
            busy={busyKey !== null}
            footer={(
                <>
                    {removableCount > 0 && (
                        <Button
                            variant="ghost"
                            className="mr-auto text-danger hover:text-danger"
                            onClick={() => { setRemoveError(''); setPendingRemoval('all'); }}
                            disabled={busyKey !== null}
                            leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                        >
                            Remove all
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose} disabled={busyKey !== null}>Done</Button>
                </>
            )}
        >
            <div className="flex flex-col gap-6">
                {error && <Alert tone="danger" onDismiss={() => setError('')}>{error}</Alert>}

                <section aria-labelledby="types-in-use">
                    <h3 id="types-in-use" className="mb-2 text-sm font-semibold text-fg">In use</h3>
                    <ul className="flex flex-col gap-2">
                        {eventTypes.types.map(type => (
                            // Keyed on the saved values too, so a row resets to what the server has after each save.
                            <TypeRow
                                key={`${type.id}-${type.name}-${type.color}`}
                                type={type}
                                busy={busyKey !== null}
                                saving={busyKey === `save-${type.id}`}
                                onSave={body => run(`save-${type.id}`, () => api.put(`/teams/${teamId}/event-types/${type.id}`, body), `${body.name} saved.`)}
                                onRemove={() => { setRemoveError(''); setPendingRemoval(type); }}
                            />
                        ))}
                    </ul>
                </section>

                {eventTypes.availablePresets.length > 0 && (
                    <section aria-labelledby="premade-types">
                        <h3 id="premade-types" className="mb-2 text-sm font-semibold text-fg">Add a premade type</h3>
                        <ul className="flex flex-wrap gap-2">
                            {eventTypes.availablePresets.map(preset => {
                                return (
                                    <li key={preset.preset}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => addPreset(preset)}
                                            loading={busyKey === `preset-${preset.preset}`}
                                            disabled={busyKey !== null && busyKey !== `preset-${preset.preset}`}
                                            leftIcon={<Plus className="size-4" aria-hidden="true" />}
                                        >
                                            <span className="flex size-5 items-center justify-center rounded" style={{ backgroundColor: preset.color, color: textColorFor(preset.color) }}>
                                                <EventTypeIcon type={preset} className="size-3" />
                                            </span>
                                            {preset.name}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                <CustomTypeForm
                    busy={busyKey !== null}
                    saving={busyKey === 'custom'}
                    onAdd={body => run('custom', () => api.post(`/teams/${teamId}/event-types`, body), `${body.name} added.`)}
                />
            </div>

            <ConfirmDialog
                open={pendingRemoval !== null}
                onClose={() => setPendingRemoval(null)}
                onConfirm={confirmRemoval}
                title={pendingRemoval === 'all' ? 'Remove all event types' : 'Remove event type'}
                confirmLabel={pendingRemoval === 'all' ? 'Remove all' : 'Remove type'}
                busyLabel="Removing..."
                busy={busyKey === 'remove'}
                error={removeError}
            >
                {pendingRemoval === 'all' ? (
                    <>Remove every event type except <strong className="text-fg">Other</strong>? No events are deleted: they all move to Other. Premade types can be added back later.</>
                ) : (
                    <>Remove <strong className="text-fg">{pendingRemoval?.name}</strong>? Its events stay on the calendar and move to <strong className="text-fg">Other</strong>.</>
                )}
            </ConfirmDialog>
        </Modal>
    );
}

interface TypeRowProps {
    type: TeamEventType;
    busy: boolean;
    saving: boolean;
    onSave: (body: SaveEventTypeRequest) => Promise<boolean>;
    onRemove: () => void;
}

function TypeRow({ type, busy, saving, onSave, onRemove }: TypeRowProps) {
    const [name, setName] = useState(type.name);
    const [color, setColor] = useState(type.color);
    const changed = name.trim() !== type.name || color.toUpperCase() !== type.color.toUpperCase();

    if (type.isLocked) {
        return (
            <li className="flex items-center gap-3 rounded-md border border-line bg-sunken px-3 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded" style={{ backgroundColor: type.color, color: textColorFor(type.color) }}>
                    <EventTypeIcon type={type} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{type.name}</span>
                    <span className="block text-xs text-fg-muted">Always there. Events from removed types move here.</span>
                </span>
                <Lock className="size-4 shrink-0 text-fg-subtle" aria-label="Can't be changed" />
            </li>
        );
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim() || !changed) return;
        void onSave({ name: name.trim(), color: color.toUpperCase() });
    };

    return (
        <li>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-md border border-line px-3 py-2">
                <ColorInput label={`Colour of ${type.name}`} value={color} onChange={setColor} disabled={busy} />
                <Field label={`Name of ${type.name}`} hideLabel className="min-w-0 flex-1">
                    <Input value={name} onChange={e => setName(e.target.value)} maxLength={50} disabled={busy} autoComplete="off" />
                </Field>
                {changed && (
                    <Button type="submit" size="sm" loading={saving} loadingText="Saving..." disabled={!name.trim() || (busy && !saving)}>Save</Button>
                )}
                <IconButton
                    label={`Remove ${type.name}`}
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                    onClick={onRemove}
                    disabled={busy}
                />
            </form>
        </li>
    );
}

function CustomTypeForm({ busy, saving, onAdd }: { busy: boolean; saving: boolean; onAdd: (body: SaveEventTypeRequest) => Promise<boolean> }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(DEFAULT_CUSTOM_COLOR);
    const [showError, setShowError] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            setShowError(true);
            return;
        }
        if (await onAdd({ name: name.trim(), color: color.toUpperCase() })) {
            setName('');
            setShowError(false);
        }
    };

    return (
        <section aria-labelledby="custom-type">
            <h3 id="custom-type" className="mb-2 text-sm font-semibold text-fg">Add your own type</h3>
            <form onSubmit={handleSubmit} noValidate className="flex items-start gap-2">
                <ColorInput label="Colour of the new type" value={color} onChange={setColor} disabled={busy} />
                <Field label="Name of the new type" hideLabel className="min-w-0 flex-1" error={showError && !name.trim() ? 'Give the type a name.' : undefined}>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bootcamp" maxLength={50} disabled={busy && !saving} autoComplete="off" />
                </Field>
                <Button type="submit" loading={saving} loadingText="Adding..." disabled={busy && !saving} leftIcon={<Plus className="size-4" aria-hidden="true" />}>Add</Button>
            </form>
        </section>
    );
}

function ColorInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
    return (
        <input
            type="color"
            aria-label={label}
            // The native picker only takes lowercase #rrggbb.
            value={COLOR_PATTERN.test(value) ? value.toLowerCase() : '#000000'}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-line bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
    );
}
