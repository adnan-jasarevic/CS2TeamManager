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

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [actionState, setActionState] = useState<{ type: 'kick' | 'role' | 'transfer' | null, member: TeamMember | null }>({ type: null, member: null });
    const [transferConfirmText, setTransferConfirmText] = useState('');
    const [newRole, setNewRole] = useState('Member');

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

    const showMessage = (msg: string, isError = false) => {
        if (isError) setError(msg);
        else setSuccessMsg(msg);
        setTimeout(() => { setError(''); setSuccessMsg(''); }, 4000);
    };

    const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedTeamId || !newMemberEmail.trim()) return;

        setIsSubmitting(true);
        try {
            await api.post(`/Teams/${selectedTeamId}/members`, { userEmail: newMemberEmail });
            showMessage(`Successfully invited ${newMemberEmail} to the team!`);
            setNewMemberEmail('');
            setIsAddModalOpen(false);
            fetchTeamMembers(selectedTeamId);
        } catch (err: unknown) {
            showMessage(axios.isAxiosError(err) ? err.response?.data?.message || 'Failed to add member.' : 'Failed to add member.', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeKick = async () => {
        if (!selectedTeamId || !actionState.member) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/Teams/${selectedTeamId}/members/${actionState.member.id}`);
            showMessage(`Successfully removed ${actionState.member.username}.`);
            fetchTeamMembers(selectedTeamId);
            closeModals();
        } catch (err: unknown) {
            showMessage(axios.isAxiosError(err) ? err.response?.data?.message || 'Failed to remove member.' : 'Failed to remove member.', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeRoleChange = async () => {
        if (!selectedTeamId || !actionState.member) return;
        setIsSubmitting(true);
        try {
            await api.put(`/Teams/${selectedTeamId}/members/${actionState.member.id}/role`, { newRole });
            showMessage(`Changed role for ${actionState.member.username} to ${newRole}.`);
            fetchTeamMembers(selectedTeamId);
            closeModals();
        } catch (err: unknown) {
            showMessage(axios.isAxiosError(err) ? err.response?.data?.message || 'Failed to change role.' : 'Failed to change role.', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeTransferOwnership = async () => {
        if (!selectedTeamId || !actionState.member) return;
        if (transferConfirmText !== 'CONFIRM') return;

        setIsSubmitting(true);
        try {
            await api.put(`/Teams/${selectedTeamId}/transfer-ownership`, { newOwnerId: actionState.member.id });
            showMessage(`Ownership transferred to ${actionState.member.username}.`);
            fetchTeams();
            fetchTeamMembers(selectedTeamId);
            closeModals();
        } catch (err: unknown) {
            showMessage(axios.isAxiosError(err) ? err.response?.data?.message || 'Failed to transfer ownership.' : 'Failed to transfer ownership.', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModals = () => {
        setActionState({ type: null, member: null });
        setTransferConfirmText('');
        setIsSubmitting(false);
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
        <div className="p-8 relative min-h-screen">
            {activeDropdown && (
                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)}></div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Team Roster</h1>
                    <p className="text-gray-400">Manage your players and roles.</p>
                </div>

                <div className="flex items-end gap-4 relative z-20">
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

            {/* Obrisano overflow-hidden ovdje */}
            <div className="bg-[#181a2d] rounded-xl border border-gray-800 shadow-md relative z-20">
                {/* Dodano rounded-t-xl ovdje */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 text-sm font-bold text-gray-400 uppercase tracking-wider rounded-t-xl bg-[#181a2d]">
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
                        {members.map((member, index) => (
                            <div key={member.id} className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#111322] transition-colors ${index === members.length - 1 ? 'rounded-b-xl' : ''}`}>
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

                        <div className="col-span-3 md:col-span-2 flex justify-end relative">
                            {isOwner && member.role !== 'Owner' && (
                                <>
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                    </button>

                                    {/* Podignut z-index na z-50 */}
                                    {activeDropdown === member.id && (
                                        <div className="absolute right-0 top-10 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                                            <button
                                                onClick={() => { setActionState({ type: 'role', member }); setNewRole(member.role); setActiveDropdown(null); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                                            >
                                                Change Role
                                            </button>
                                            <button
                                                onClick={() => { setActionState({ type: 'transfer', member }); setActiveDropdown(null); }}
                                                className="w-full text-left px-4 py-2 text-sm text-yellow-500 hover:bg-gray-700"
                                            >
                                                Transfer Ownership
                                            </button>
                                            <div className="h-px bg-gray-700 my-1"></div>
                                            <button
                                                onClick={() => { setActionState({ type: 'kick', member }); setActiveDropdown(null); }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-700"
                                            >
                                                Kick Player
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
                )}
        </div>

            {/* 1. INVITE MODAL */ }
    {
        isAddModalOpen && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Invite Player</h2>
                        <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <form onSubmit={handleAddMember} className="p-6">
                        <p className="text-sm text-gray-400 mb-4">Enter the email address of the user you want to invite.</p>
                        <input
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-[#111322] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b4a]"
                            placeholder="player@example.com"
                            required autoFocus
                        />
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" disabled={isSubmitting || !newMemberEmail.trim()} className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50">
                                {isSubmitting ? 'Inviting...' : 'Send Invite'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    {/* 2. KICK MODAL */ }
    {
        actionState.type === 'kick' && actionState.member && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl shadow-xl border border-red-500/30 w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-red-500">Kick Player</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-300 mb-6">Are you sure you want to remove <strong className="text-white">{actionState.member.username}</strong> from the team? They will lose access to team data.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={closeModals} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={executeKick} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50">
                                {isSubmitting ? 'Removing...' : 'Kick Player'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    {/* 3. ROLE MODAL */ }
    {
        actionState.type === 'role' && actionState.member && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Change Role: {actionState.member.username}</h2>
                    </div>
                    <div className="p-6">
                        <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full bg-[#111322] border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#ff6b4a] mb-6"
                        >
                        <option value="Player">Player</option>
                        <option value="Captain">Captain</option>
                        </select>

                        <div className="flex justify-end gap-3">
                            <button onClick={closeModals} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={executeRoleChange} disabled={isSubmitting} className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50">
                                Save Role
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    {/* 4. TRANSFER OWNERSHIP MODAL */ }
    {
        actionState.type === 'transfer' && actionState.member && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl shadow-xl border border-yellow-500/30 w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-yellow-500">Transfer Ownership</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-300 mb-4 text-sm">
                            You are about to transfer full team ownership to <strong className="text-white">{actionState.member.username}</strong>. You will be demoted to a standard Member and will lose Owner privileges.
                        </p>
                        <p className="text-gray-400 text-xs mb-2">Type <strong>CONFIRM</strong> below to proceed.</p>
                        <input
                            type="text"
                            value={transferConfirmText}
                            onChange={(e) => setTransferConfirmText(e.target.value)}
                            className="w-full px-4 py-3 bg-[#111322] border border-gray-700 rounded-lg text-white mb-6 focus:outline-none focus:border-yellow-500"
                            placeholder="CONFIRM"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={closeModals} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button
                                onClick={executeTransferOwnership}
                                disabled={isSubmitting || transferConfirmText !== 'CONFIRM'}
                                className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                            >
                                Transfer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
        </div >
    );
}
