import { useState, type FormEvent } from 'react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { type Team } from '../types';
import { Alert, Button, Field, Input, Modal } from './ui';

interface CreateTeamModalProps {
    onClose: () => void;
    onCreated: (team: Team) => void;
}

export default function CreateTeamModal({ onClose, onCreated }: CreateTeamModalProps) {
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setError('');
        try {
            const response = await api.post<Team>('/Teams', { name: name.trim() });
            onCreated(response.data);
            onClose();
        } catch (err) {
            // For example the 3-team limit, or a name with characters that aren't allowed.
            setError(getApiErrorMessage(err, 'Failed to create the team. Please try again.'));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Create a new team"
            size="sm"
            busy={isCreating}
            closeOnBackdrop={false}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={isCreating}>Cancel</Button>
                    <Button type="submit" form="create-team-form" disabled={!name.trim()} loading={isCreating} loadingText="Creating...">Create team</Button>
                </>
            }
        >
            <form id="create-team-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <Alert tone="danger">{error}</Alert>}
                <Field label="Team name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tokyo Ronin" maxLength={100} autoComplete="off" data-autofocus />
                </Field>
            </form>
        </Modal>
    );
}
