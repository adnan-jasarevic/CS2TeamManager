import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import { type Team } from '../types';

type ValidationErrorResponse = {
    title?: string;
    status?: number;
    message?: string;
    errors?: Record<string, string[]>;
};


export default function Dashboard() {
    const navigate = useNavigate();

    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Extracted fetch function so we can reuse it after creating a new team
    const fetchTeams = async () => {
        setLoading(true);
        try {
            const response = await api.get<Team[]>('/Teams/my-teams');
            setTeams(response.data);
            setError('');
        } catch (err: unknown) {
            console.error('Error fetching teams:', err);

            if (axios.isAxiosError(err)) {
                if (err.response?.status === 401) {
                    localStorage.removeItem('jwt_token');
                    navigate('/login');
                    return;
                }
            }

            setError('Failed to load teams. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        navigate('/login');
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setIsCreating(true);

        try {
            await api.post('/Teams', { name: newTeamName });

            setNewTeamName('');
            setIsModalOpen(false);
            await fetchTeams();

        } catch (err: unknown) {
            console.error('Error creating team:', err);

            if (axios.isAxiosError<ValidationErrorResponse>(err)) {
                const responseData = err.response?.data;

                // Handle FluentValidation errors from C# backend 
                if (responseData?.errors && responseData.errors['Name']) {
                    setCreateError(responseData.errors['Name'][0]);
                    return;
                }

                // Handle standard API bad request errors
                if (responseData?.message) {
                    setCreateError(responseData.message);
                    return;
                }
            }

            setCreateError('Failed to create team. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 relative">

            {/* Header Section */}
            <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold">My Teams</h1>
                <div className="flex gap-4">
                    {/* Button to open the Create Team Modal */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition-colors"
                    >
                        + New Team
                    </button>
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition-colors"
                    >
                        Log out
                    </button>
                </div>
            </div>

            {/* Main Content Section */}
            <div className="max-w-6xl mx-auto">
                {loading && <p className="text-gray-400 text-lg">Loading your teams...</p>}

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">
                        {error}
                    </div>
                )}

                {!loading && !error && teams.length === 0 ? (
                    <div className="text-center py-10 bg-gray-800 rounded-lg border border-gray-700">
                        <h2 className="text-xl text-gray-300 mb-4">You are not in any team yet.</h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold transition-colors"
                        >
                            Create a Team
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow hover:border-blue-500 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold truncate">{team.name}</h3>
                                    <span className={`px-2 py-1 text-xs rounded font-bold ${team.currentUserRole === 'Owner'
                                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                        }`}>
                                        {team.currentUserRole}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Created: {new Date(team.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CREATE TEAM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Create New Team</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleCreateTeam} className="p-6">
                            {createError && (
                                <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                                    {createError}
                                </div>
                            )}

                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Team Name
                            </label>
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. Natus Vincere"
                                autoFocus
                            />

                            {/* Modal Actions */}
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newTeamName.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded font-bold transition-colors"
                                >
                                    {isCreating ? 'Creating...' : 'Create Team'}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}