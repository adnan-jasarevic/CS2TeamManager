import React, { useState } from 'react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';

type CreateTeamModalProps = {
    onClose: () => void;
    onCreated: () => void;
};

export default function CreateTeamModal({ onClose, onCreated }: CreateTeamModalProps) {
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreating(true);
        setError('');
        try {
            await api.post('/Teams', { name });
            onCreated();
            onClose();
        } catch (err) {
            // For example the 3-team limit, or a name with characters that aren't allowed.
            setError(getApiErrorMessage(err, 'Failed to create the team. Please try again.'));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Create New Team</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <label className="block text-gray-400 text-sm mb-2" htmlFor="team-name">Team Name</label>
                    <input
                        id="team-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#111322] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b4a]"
                        placeholder="e.g. Natus Vincere"
                        autoFocus
                    />
                    {error && (
                        <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" disabled={isCreating || !name.trim()} className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50">
                            {isCreating ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
