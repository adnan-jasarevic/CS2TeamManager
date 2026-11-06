import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Bell, LogOut, Mail, Moon, Sun } from 'lucide-react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useTheme } from '../theme/theme-context';
import { type Team, type TeamInvite, roleLabel } from '../types';
import { LogoMark } from './brand/logo';
import { Alert, Button, EmptyState, Field, IconButton, Modal, Select } from './ui';

interface TopNavigationProps {
    teams: Team[];
    selectedTeam: Team | null;
    onSelectTeam: (teamId: number) => void;
    onInviteAccepted: () => void;
    onLogout: () => void;
}

type Feedback = { type: 'success' | 'error'; text: string } | null;

export default function TopNavigation({ teams, selectedTeam, onSelectTeam, onInviteAccepted, onLogout }: TopNavigationProps) {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [respondingIds, setRespondingIds] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<Feedback>(null);

    // Only the latest fetch may update state. A new fetch, a successful response and unmounting
    // all abort the one in flight, so an older response can't bring back an invite that was just
    // answered and quick page changes don't pile up requests.
    const fetchController = useRef<AbortController | null>(null);
    const respondingRef = useRef(new Set<number>());
    const bellRef = useRef<HTMLButtonElement>(null);

    const fetchInvites = useCallback(async () => {
        fetchController.current?.abort();
        const controller = new AbortController();
        fetchController.current = controller;
        try {
            const response = await api.get<TeamInvite[]>('/Teams/my-invites', { signal: controller.signal });
            if (!controller.signal.aborted) setInvites(response.data);
        } catch {
            // Keep showing the last list that loaded; the next refresh tries again.
        }
    }, []);

    useEffect(() => {
        fetchInvites();
    }, [location.pathname, fetchInvites]);

    useEffect(() => () => fetchController.current?.abort(), []);

    const openModal = () => {
        setFeedback(null);
        setShowInviteModal(true);
    };

    const closeModal = () => {
        setShowInviteModal(false);
        setFeedback(null);
    };

    const handleInviteResponse = async (invite: TeamInvite, isAccepted: boolean) => {
        if (respondingRef.current.has(invite.inviteId)) return;
        respondingRef.current.add(invite.inviteId);
        setRespondingIds(ids => [...ids, invite.inviteId]);
        setFeedback(null);

        try {
            // The endpoint takes a bare JSON boolean: POST /api/Teams/invites/{id}/respond with body `true` or `false`.
            const response = await api.post<{ message?: string }>(`/Teams/invites/${invite.inviteId}/respond`, isAccepted);

            fetchController.current?.abort();
            setInvites(prev => prev.filter(inv => inv.inviteId !== invite.inviteId));
            setFeedback({
                type: 'success',
                text: response.data?.message ?? (isAccepted ? `You joined ${invite.teamName}.` : 'Invite declined.'),
            });

            if (isAccepted) onInviteAccepted();
        } catch (err) {
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

    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:px-6">
                <LogoMark size={28} className="shrink-0 lg:hidden" />

                <div className="min-w-0 flex-1 lg:max-w-xs">
                    {teams.length > 0 && selectedTeam && (
                        <Field label="Team" hideLabel>
                            <Select
                                value={selectedTeam.id}
                                onChange={onSelectTeam}
                                options={teams.map(team => ({ value: team.id, label: team.name, hint: roleLabel(team) }))}
                            />
                        </Field>
                    )}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1">
                    <IconButton
                        ref={bellRef}
                        onClick={openModal}
                        label={invites.length > 0 ? `View invites, ${invites.length} pending` : 'View invites'}
                        icon={<Bell className="size-5" aria-hidden="true" />}
                        badge={invites.length}
                    />
                    <IconButton
                        onClick={toggleTheme}
                        label={`Switch to ${nextTheme} theme`}
                        icon={theme === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
                    />
                    <IconButton onClick={onLogout} label="Log out" className="lg:hidden" icon={<LogOut className="size-5" aria-hidden="true" />} />
                </div>
            </header>

            {invites.length > 0 && (
                <section aria-label="Pending invites" className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-accent-soft px-4 py-2 lg:px-6">
                    <p className="flex items-center gap-2 text-sm text-fg">
                        <Mail className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                        <span>You have <strong>{invites.length}</strong> pending team invite{invites.length > 1 ? 's' : ''}.</span>
                    </p>
                    <Button size="sm" onClick={openModal}>View invites</Button>
                </section>
            )}

            <Modal open={showInviteModal} onClose={closeModal} title="Pending team invites" returnFocusRef={bellRef}>
                <div className="flex flex-col gap-4">
                    {feedback && <Alert tone={feedback.type === 'error' ? 'danger' : 'success'}>{feedback.text}</Alert>}

                    {invites.length === 0 ? (
                        <EmptyState compact icon={<Mail />} title="No pending invites" description="When a team invites you, it shows up here." />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {invites.map(invite => {
                                const isResponding = respondingIds.includes(invite.inviteId);
                                return (
                                    <li key={invite.inviteId} className="flex flex-col justify-between gap-3 rounded-md border border-line bg-sunken p-4 sm:flex-row sm:items-center">
                                        <div className="min-w-0">
                                            <h3 className="font-bold break-words text-fg">{invite.teamName}</h3>
                                            <p className="text-sm text-fg-muted">Invited by <span className="font-medium text-fg">{invite.senderUsername}</span></p>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <Button size="sm" onClick={() => handleInviteResponse(invite, true)} loading={isResponding} aria-label={`Accept invite to ${invite.teamName}`}>
                                                Accept
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleInviteResponse(invite, false)} disabled={isResponding} aria-label={`Decline invite to ${invite.teamName}`}>
                                                Decline
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </Modal>
        </>
    );
}
