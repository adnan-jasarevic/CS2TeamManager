import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import { type Team, type TeamDashboardData } from '../types';

export default function Dashboard() {
    const navigate = useNavigate();

    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [dashboardData, setDashboardData] = useState<TeamDashboardData | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchTeams = useCallback(async () => {
        try {
            const response = await api.get<Team[]>('/Teams/my-teams');
            setTeams(response.data);

            if (response.data.length > 0 && selectedTeamId === null) {
                setSelectedTeamId(response.data[0].id);
            }
        } catch (err: unknown) {
            console.error('Error fetching teams:', err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                localStorage.removeItem('jwt_token');
                navigate('/login');
            } else {
                setError('Failed to load teams.');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate, selectedTeamId]);

    const fetchDashboardStats = async (teamId: number) => {
        try {
            const response = await api.get<TeamDashboardData>(`/Teams/${teamId}/dashboard`);
            setDashboardData(response.data);
        } catch (err: unknown) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load team statistics.');
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    useEffect(() => {
        if (selectedTeamId !== null) {
            fetchDashboardStats(selectedTeamId);
        }
    }, [selectedTeamId]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await api.post('/Teams', { name: newTeamName });
            setNewTeamName('');
            setIsModalOpen(false);
            await fetchTeams();
        } catch (err) {
            console.error('Failed to create team', err);
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) return <div className="text-gray-400 p-8">Loading dashboard...</div>;

    // scenario 1: user has no teams - show empty state with option to create team
    if (teams.length === 0) {
        return (
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-gray-400">Welcome! Get started by creating your first team.</p>
                </div>

                <div className="text-center py-16 bg-[#181a2d] rounded-xl border border-gray-800">
                    <h2 className="text-xl text-gray-300 mb-6">You are not in any team yet.</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-3 rounded-lg font-bold transition-colors shadow-lg"
                    >
                        Create a Team
                    </button>
                </div>

            </div>
        );
    }

    // scenario 2: user has teams - show dashboard with team selection dropdown and stats
    return (
        <div className="p-8 relative">

            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-gray-400">Welcome back! Here's your team overview.</p>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">Select Team:</label>
                    <select
                        className="bg-[#181a2d] border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#ff6b4a]"
                        value={selectedTeamId || ''}
                        onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                    >
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.currentUserRole})</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">{error}</div>}

            {dashboardData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-[#181a2d] p-6 rounded-xl border border-gray-800 shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-gray-400 font-medium">Total Matches</span>
                                <span>🏆</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-1">{dashboardData.totalMatches}</h2>
                        </div>

                        <div className="bg-[#181a2d] p-6 rounded-xl border border-gray-800 shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-gray-400 font-medium">Win Rate</span>
                                <span className="text-[#ff6b4a]">📈</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-1">{dashboardData.winRatePercentage}%</h2>
                        </div>

                        <div className="bg-[#181a2d] p-6 rounded-xl border border-gray-800 shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-gray-400 font-medium">Team Members</span>
                                <span>👥</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-1">{dashboardData.totalMembers}</h2>
                        </div>

                        <div className="bg-[#181a2d] p-6 rounded-xl border border-gray-800 shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-gray-400 font-medium">Upcoming</span>
                                <span>📅</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-1">{dashboardData.upcomingMatchesCount}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                        <div className="bg-[#181a2d] p-6 rounded-xl border border-gray-800 shadow-md flex flex-col">
                            <h3 className="text-lg font-bold mb-6 text-white">Recent Matches</h3>

                            <div className="flex-1 flex flex-col gap-4">
                                {dashboardData.recentMatches.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No recent matches played yet.</p>
                                ) : (
                                    dashboardData.recentMatches.map(match => (
                                        <div key={match.id} className="flex items-center justify-between p-4 bg-[#111322] rounded-lg border border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <span className={`px-3 py-1 rounded text-xs font-bold w-14 text-center ${match.matchOutcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        match.matchOutcome === 'LOSS' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {match.matchOutcome}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-white">vs {match.opponentName}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(match.scheduledDate)}</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-white">{match.finalScore}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button className="w-full mt-6 py-3 bg-[#111322] hover:bg-gray-800 text-sm font-medium rounded-lg transition-colors border border-gray-800">
                                View All Matches
                            </button>
                        </div>

                        {/* UPCOMING MATCHES */}
                        <div className="bg-[#181a2d] p-6 rounded-xl border border-gray-800 shadow-md flex flex-col">
                            <h3 className="text-lg font-bold mb-6 text-white">Upcoming Matches</h3>

                            <div className="flex-1 flex flex-col gap-4">
                                {dashboardData.upcomingMatches.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No upcoming matches scheduled.</p>
                                ) : (
                                    dashboardData.upcomingMatches.map(match => (
                                        <div key={match.id} className="flex items-center justify-between p-4 bg-[#111322] rounded-lg border border-gray-800">
                                            <div>
                                                <p className="font-bold text-white">vs {match.opponentName}</p>
                                                <p className="text-xs text-gray-500">{formatDate(match.scheduledDate)}</p>
                                            </div>
                                            <span className="text-sm font-bold text-[#ff6b4a]">{formatTime(match.scheduledDate)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button className="w-full mt-6 py-3 bg-[#111322] hover:bg-gray-800 text-sm font-medium rounded-lg transition-colors border border-gray-800">
                                View Calendar
                            </button>
                        </div>

                    </div>
                </>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Create New Team</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreateTeam} className="p-6">
                            <label className="block text-gray-400 text-sm mb-2">Team Name</label>
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="w-full px-4 py-3 bg-[#111322] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b4a]"
                                placeholder="e.g. Natus Vincere"
                                autoFocus
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                <button type="submit" disabled={isCreating || !newTeamName.trim()} className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50">
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
