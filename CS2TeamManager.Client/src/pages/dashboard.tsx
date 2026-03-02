import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import { type Team } from '../types';

export default function Dashboard() {
    const navigate = useNavigate();

    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await api.get<Team[]>('/Team');
                setTeams(response.data);
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

        fetchTeams();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold">My Teams</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition-colors"
                >
                    Log out
                </button>
            </div>

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
                        <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold transition-colors">
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
        </div>
    );
}