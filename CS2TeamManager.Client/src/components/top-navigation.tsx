import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { type TeamInvite } from '../types';

export default function TopNavigation() {
    const location = useLocation();
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        const fetchInvites = async () => {
            try {
                const response = await api.get<TeamInvite[]>('/Teams/my-invites');
                setInvites(response.data);
            } catch (err) {
                console.error("Failed to load invites", err);
            }
        };

        if (localStorage.getItem('jwt_token') && !location.pathname.includes('/login') && !location.pathname.includes('/register')) {
            fetchInvites();
        }
    }, [location.pathname]);

    if (!localStorage.getItem('jwt_token') || location.pathname.includes('/login') || location.pathname.includes('/register')) {
        return null;
    }


    return (
        <div className="w-full flex flex-col z-40 bg-[#0b0c10]">
            <header className="h-16 border-b border-gray-800 flex items-center justify-end px-8 bg-[#111322]">
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="relative p-2 text-gray-400 hover:text-white transition-colors"
                    title="View Invites"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            {/* --- NOTIFICATION BANNER --- */}
            {invites.length > 0 && (
                <div className="bg-gradient-to-r from-[#ff6b4a]/20 to-purple-600/20 border-b border-[#ff6b4a]/30 px-8 py-3 flex justify-between items-center shadow-md z-30">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🔔</span>
                        <p className="text-white text-sm">
                            You have <strong>{invites.length}</strong> pending team invite{invites.length > 1 ? 's' : ''}!
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-[#ff6b4a] hover:bg-[#e5593c] text-white text-xs font-bold px-4 py-1.5 rounded transition-colors shadow-lg"
                    >
                        View Invites
                    </button>
                </div>
            )}

            {showInviteModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#181a2d] rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#111322]">
                            <h2 className="text-xl font-bold text-white">Pending Team Invites</h2>
                            <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {invites.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">You have no pending invites.</p>
                            ) : (
                                <div className="space-y-4">
                                    {invites.map(invite => (
                                        <div key={invite.inviteId} className="bg-[#111322] border border-gray-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{invite.teamName}</h3>
                                                <p className="text-gray-400 text-sm">Invited by: <span className="text-[#ff6b4a]">{invite.senderUsername}</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="px-4 py-2 rounded font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                                                    Accept
                                                </button>
                                                <button className="px-4 py-2 rounded font-bold text-sm border border-gray-600 text-gray-300 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 transition-colors">
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}