import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import { type Team, type TeamMember } from '../types';

export default function TeamRoster() {
    const navigate = useNavigate();

    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTeams = useCallback(async () => {
        try {
            const response = await api.get<Team[]>('/Teams/my-teams');
            setTeams(response.data);

            if (response.data.length > 0 && selectedTeamId === null) {
                setSelectedTeamId(response.data[0].id);
            } else if (response.data.length === 0) {
                setLoading(false);
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                localStorage.removeItem('jwt_token');
                navigate('/login');
            } else {
                setError('Failed to load teams.');
                setLoading(false);
            }
        }
    }, [navigate, selectedTeamId]);

    const fetchTeamMembers = async (teamId: number) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<TeamMember[]>(`/Teams/${teamId}/members`);
            setMembers(response.data);
        } catch (err: unknown) {
            console.error('Error fetching members:', err);
            setError('Failed to load team members.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    useEffect(() => {
        if (selectedTeamId !== null) {
            fetchTeamMembers(selectedTeamId);
        }
    }, [selectedTeamId]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId || !newMemberEmail.trim()) return;

        setIsSubmitting(true);
        setError('');
        setSuccessMsg('');

        try {
            await api.post(`/Teams/${selectedTeamId}/members`, { userEmail: newMemberEmail });
            setSuccessMsg(`Successfully invited ${newMemberEmail} to the team!`);
            setNewMemberEmail('');
            setIsAddModalOpen(false);
            fetchTeamMembers(selectedTeamId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add member. Check if email is correct.');
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const handleRemoveMember = async (memberId: string, username: string) => {
        if (!selectedTeamId) return;

        if (!window.confirm(`Are you sure you want to remove ${username} from the team?`)) {
            return;
        }

        try {
            await api.delete(`/Teams/${selectedTeamId}/members/${memberId}`);
            setSuccessMsg(`Successfully removed ${username}.`);
            fetchTeamMembers(selectedTeamId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to remove member.');
        } finally {
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const currentTeam = teams.find(t => t.id === selectedTeamId);
    const isOwner = currentTeam?.currentUserRole === 'Owner';

    if (loading && teams.length === 0) return <div className="text-gray-400 p-8">Loading roster...</div>;

    if (teams.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold text-white mb-2">Team Roster</h1>
                <p className="text-gray-400">You need to create or join a team first.</p>
            </div>
        );
    }

    return (
        <div className="p-8 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Team Roster</h1>
                    <p className="text-gray-400">Manage your players and roles.</p>
                </div>

                <div className="flex items-end gap-4">
                    {isOwner && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-[#ff6b4a] hover:bg-[#e5593c] text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-lg"
                        >
                            + Invite Player
                        </button>
                    )}

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
            </div>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">{error}</div>}
            {successMsg && <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 p-4 rounded mb-6">{successMsg}</div>}

            <div className="bg-[#181a2d] rounded-xl border border-gray-800 shadow-md overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 text-sm font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-5 md:col-span-4">Player</div>
                    <div className="col-span-4 md:col-span-3">Role</div>
                    <div className="hidden md:block col-span-3">Joined</div>
                    <div className="col-span-3 md:col-span-2 text-right">Actions</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading players...</div>
                ) : members.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No members found.</div>
                ) : (
                    <div className="divide-y divide-gray-800/50">
                        {members.map(member => (
                            <div key={member.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#111322] transition-colors">
                                <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-[#ff6b4a] flex items-center justify-center text-white font-bold">
                                        {member.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{member.username}</p>
                                        <p className="text-xs text-gray-500 truncate w-32 md:w-auto">{member.email}</p>
                                    </div>
                                </div>

                                <div className="col-span-4 md:col-span-3">
                                    <span className={`px-3 py-1 rounded text-xs font-bold ${member.role === 'Owner' ? 'bg-[#ff6b4a]/20 text-[#ff6b4a] border border-[#ff6b4a]/30' :
                                            'bg-gray-700/30 text-gray-300'
                                        }`}>
                                        {member.role}
                                    </span>
                                </div>

                                <div className="hidden md:block col-span-3 text-sm text-gray-400">
                                    {new Date(member.joinedAt).toLocaleDateString()}
                                </div>

                                <div className="col-span-3 md:col-span-2 flex justify-end">
                                    {isOwner && member.role !== 'Owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id, member.username)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            title="Remove Player"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* INVITE MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Invite Player</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-6">
                            <p className="text-sm text-gray-400 mb-4">Enter the email address of the user you want to invite to your team. They must be registered on the platform.</p>

                            <label className="block text-gray-400 text-sm mb-2">Player Email</label>
                            <input
                                type="email"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-[#111322] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b4a]"
                                placeholder="player@example.com"
                                required
                                autoFocus
                            />

                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newMemberEmail.trim()}
                                    className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Inviting...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
