import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { type TeamInvite } from '../types';

interface TopNavigationProps {
    onInviteAccepted: () => void;
}

type Feedback = { type: 'success' | 'error'; text: string } | null;

export default function TopNavigation({ onInviteAccepted }: TopNavigationProps) {
    const location = useLocation();

    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [respondingIds, setRespondingIds] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<Feedback>(null);

    // Each fetch gets a sequence number. Only the latest one may update state, and a
    // successful response bumps the sequence so an older in-flight fetch can't bring back
    // an invite that was just answered.
    const fetchSeq = useRef(0);
    const respondingRef = useRef(new Set<number>());
    const bellRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const fetchInvites = useCallback(async () => {
        const seq = ++fetchSeq.current;
        try {
            const response = await api.get<TeamInvite[]>('/Teams/my-invites');
            if (seq === fetchSeq.current) setInvites(response.data);
        } catch (err) {
            console.error('Failed to load invites', err);
        }
    }, []);

    useEffect(() => {
        fetchInvites();
    },[location.pathname, fetchInvites]);

    const openModal = () => {
        setFeedback(null);
        setShowInviteModal(true);
    };

    const closeModal = useCallback(() => {
        setShowInviteModal(false);
        setFeedback(null);
        bellRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!showInviteModal) return;
        closeRef.current?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [showInviteModal, closeModal]);

    const handleInviteResponse = async (invite: TeamInvite, isAccepted: boolean) => {
        if (respondingRef.current.has(invite.inviteId)) return;
        respondingRef.current.add(invite.inviteId);
        setRespondingIds(ids => [...ids, invite.inviteId]);
        setFeedback(null);

        try {
            // The endpoint takes a bare JSON boolean: POST /api/Teams/invites/{id}/respond with body `true` or `false`.
            const response = await api.post<{ message?: string }>(`/Teams/invites/${invite.inviteId}/respond`, isAccepted);

            fetchSeq.current++;
            setInvites(prev => prev.filter(inv => inv.inviteId !== invite.inviteId));
            setFeedback({
                type: 'success',
                text: response.data?.message ?? (isAccepted ? `You joined ${invite.teamName}.` : 'Invite declined.'),
            });

            if (isAccepted) onInviteAccepted();
        } catch (err) {
            console.error('Failed to respond to invite', err);
            setFeedback({ type: 'error', text: getApiErrorMessage(err, 'Failed to process your response. Please try again.') });

            // A 400, 403 or 404 means the invite is no longer answerable (already answered, already a
            // member, deleted...), so reload the list instead of leaving a stale invite on screen.
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status === 400 || status === 403 || status === 404) fetchInvites();
        } finally {
            respondingRef.current.delete(invite.inviteId);
            setRespondingIds(ids => ids.filter(id => id !== invite.inviteId));
        }
    };

    return (
        <>
            <header className="h-16 border-b border-gray-800 flex items-center justify-end px-8 bg-[#181a2d] shrink-0 z-10">
                <button
                    ref={bellRef}
                    onClick={openModal}
                    className="relative p-2 text-gray-400 hover:text-white transition-colors"
                    title="View Invites"
                    aria-label={invites.length > 0 ? `View invites (${invites.length} pending)` : 'View invites'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {invites.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </button>
            </header>

            {invites.length > 0 && (
                <div className="bg-gradient-to-r from-[#ff6b4a]/20 to-purple-600/20 border-b border-[#ff6b4a]/30 px-8 py-3 flex justify-between items-center shrink-0 z-10 shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden="true">🔔</span>
                        <p className="text-white text-sm">
                            You have <strong>{invites.length}</strong> pending team invite{invites.length > 1 ? 's' : ''}!
                        </p>
                    </div>
                    <button onClick={openModal} className="bg-[#ff6b4a] hover:bg-[#e5593c] text-white text-xs font-bold px-4 py-1.5 rounded transition-colors shadow-lg">
                        View Invites
                    </button>
                </div>
            )}

            {showInviteModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="invite-modal-title"
                        className="bg-[#181a2d] rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#111322]">
                            <h2 id="invite-modal-title" className="text-xl font-bold text-white">Pending Team Invites</h2>
                            <button ref={closeRef} onClick={closeModal} aria-label="Close" className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {feedback && (
                                <div
                                    role={feedback.type === 'error' ? 'alert' : 'status'}
                                    className={`mb-4 px-4 py-3 rounded-lg text-sm border ${feedback.type === 'error'
                                        ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                        : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}
                                >
                                    {feedback.text}
                                </div>
                            )}

                            {invites.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">You have no pending invites.</p>
                            ) : (
                                <div className="space-y-4">
                                    {invites.map(invite => {
                                        const isResponding = respondingIds.includes(invite.inviteId);
                                        return (
                                            <div key={invite.inviteId} className="bg-[#111322] border border-gray-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <h3 className="text-white font-bold text-lg">{invite.teamName}</h3>
                                                    <p className="text-gray-400 text-sm">Invited by: <span className="text-[#ff6b4a]">{invite.senderUsername}</span></p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleInviteResponse(invite, true)}
                                                        disabled={isResponding}
                                                        aria-label={`Accept invite to ${invite.teamName}`}
                                                        className="px-4 py-2 rounded font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isResponding ? 'Working...' : 'Accept'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleInviteResponse(invite, false)}
                                                        disabled={isResponding}
                                                        aria-label={`Decline invite to ${invite.teamName}`}
                                                        className="px-4 py-2 rounded font-bold text-sm border border-gray-600 text-gray-300 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
