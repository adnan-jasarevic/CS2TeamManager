import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRightLeft, EllipsisVertical, LogOut, MailPlus, Shield, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import { type Team, type TeamMember, canManageTeam } from '../types';
import { OwnerBadge, RoleBadge } from '../components/domain-badges';
import { useLayoutContext } from '../components/layout-context';
import PageHeader, { PageContainer } from '../components/page-header';
import TeamGate from '../components/team-gate';
import {
    Alert,
    Avatar,
    Button,
    Card,
    CardHeader,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Field,
    IconButton,
    Input,
    LoadingRegion,
    Menu,
    MenuItem,
    MenuSeparator,
    Modal,
    Select,
    Skeleton,
    useToast,
} from '../components/ui';

type MemberAction = { type: 'kick' | 'role' | 'transfer'; member: TeamMember } | null;
type TeamAction = 'leave' | 'delete' | null;

const ASSIGNABLE_ROLES = ['Player', 'Officer', 'Captain'];

export default function TeamRoster() {
    return (
        <TeamGate title="Team roster">
            {team => <RosterContent key={team.id} team={team} />}
        </TeamGate>
    );
}

function RosterContent({ team }: { team: Team }) {
    const { reloadTeams } = useLayoutContext();
    const toast = useToast();

    const load = useCallback<ResourceLoader<TeamMember[]>>(
        signal => api.get<TeamMember[]>(`/Teams/${team.id}/members`, { signal }).then(response => response.data),
        [team.id],
    );
    const { data: members, error, isLoading, isFetching, reload } = useResource(load, 'Failed to load team members.');

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [action, setAction] = useState<MemberAction>(null);
    const [teamAction, setTeamAction] = useState<TeamAction>(null);
    const [newRole, setNewRole] = useState('Player');
    const [actionError, setActionError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOwner = team.isOwner;
    const canInvite = canManageTeam(team);

    // Focus returns to a removed player's menu button when the dialog closes, and the button then
    // disappears with their row once the list refreshes. Keep keyboard users in the page.
    const awaitingRemoval = useRef(false);
    useEffect(() => {
        if (!awaitingRemoval.current) return;
        awaitingRemoval.current = false;
        if (document.activeElement === document.body) document.getElementById('main')?.focus({ preventScroll: true });
    }, [members]);

    const openAction = (next: NonNullable<MemberAction>) => {
        setActionError('');
        setNewRole(next.member.role);
        setAction(next);
    };

    const closeAction = () => setAction(null);

    const runAction = async (request: () => Promise<unknown>, successMessage: string, failureMessage: string, onDone?: () => void) => {
        setIsSubmitting(true);
        setActionError('');
        try {
            await request();
            toast.success(successMessage);
            reload();
            onDone?.();
            closeAction();
        } catch (err) {
            setActionError(getApiErrorMessage(err, failureMessage));
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeKick = (member: TeamMember) => runAction(
        () => api.delete(`/Teams/${team.id}/members/${member.id}`),
        `Removed ${member.username} from the team.`,
        'Failed to remove member.',
        () => { awaitingRemoval.current = true; },
    );

    const executeRoleChange = (member: TeamMember) => runAction(
        () => api.put(`/Teams/${team.id}/members/${member.id}/role`, { newRole }),
        `${member.username} is now ${newRole === 'Officer' ? 'an' : 'a'} ${newRole}.`,
        'Failed to change role.',
        member.isOwner ? reloadTeams : undefined, // The Owner changed their own role.
    );

    const openTeamAction = (next: NonNullable<TeamAction>) => {
        setActionError('');
        setTeamAction(next);
    };

    // Leaving or deleting removes the team from the list; the layout then falls back to another team or the empty state.
    const runTeamAction = async (request: () => Promise<{ data: { message: string } }>, failureMessage: string) => {
        setIsSubmitting(true);
        setActionError('');
        try {
            const response = await request();
            toast.success(response.data.message);
            setTeamAction(null);
            reloadTeams();
        } catch (err) {
            setActionError(getApiErrorMessage(err, failureMessage));
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeLeaveTeam = () => runTeamAction(
        () => api.post<{ message: string }>(`/Teams/${team.id}/leave`),
        'Failed to leave the team.',
    );

    const executeDeleteTeam = () => runTeamAction(
        () => api.delete<{ message: string }>(`/Teams/${team.id}`),
        'Failed to delete the team.',
    );

    const executeTransfer = (member: TeamMember) => runAction(
        () => api.put(`/Teams/${team.id}/transfer-ownership`, { newOwnerId: member.id }),
        `Ownership transferred to ${member.username}.`,
        'Failed to transfer ownership.',
        reloadTeams, // The current user's own role just changed.
    );

    return (
        <PageContainer>
            <PageHeader
                title="Team roster"
                description="Manage your players and roles."
                actions={canInvite && (
                    <Button onClick={() => setIsInviteOpen(true)} leftIcon={<UserPlus className="size-4" aria-hidden="true" />}>Invite player</Button>
                )}
            />

            {error && members && <Alert tone="danger" className="mb-4">{error}</Alert>}

            <Card className="overflow-hidden">
                {isLoading ? (
                    <RosterSkeleton />
                ) : error && !members ? (
                    <ErrorState title="Couldn't load the roster" message={error} onRetry={reload} retrying={isFetching} />
                ) : !members || members.length === 0 ? (
                    <EmptyState
                        icon={<Users />}
                        title="No members found"
                        description="Invited players appear here once they accept."
                    />
                ) : (
                    <table className="w-full table-fixed text-left text-sm">
                        <caption className="sr-only">Members of {team.name}</caption>
                        <thead className="border-b border-line text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                            <tr>
                                <th scope="col" className="px-4 py-3 lg:px-5">Player</th>
                                <th scope="col" className="w-28 px-2 py-3 sm:w-36">Role</th>
                                <th scope="col" className="hidden w-36 px-2 py-3 md:table-cell">Joined</th>
                                <th scope="col" className="w-14 py-3 pr-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {members.map(member => (
                                <tr key={member.id} className="transition-colors hover:bg-hover">
                                    <td className="px-4 py-3 lg:px-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar name={member.username} className="max-sm:hidden" />
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-fg">{member.username}</p>
                                                <p className="truncate text-xs text-fg-subtle">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {member.isOwner && <OwnerBadge />}
                                            <RoleBadge role={member.role} />
                                        </div>
                                    </td>
                                    <td className="hidden px-2 py-3 text-fg-muted tabular-nums md:table-cell">
                                        {new Date(member.joinedAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 pr-3 text-right">
                                        {isOwner && (
                                            <Menu
                                                label={`Actions for ${member.username}`}
                                                renderTrigger={trigger => (
                                                    <IconButton {...trigger} size="sm" label={`Actions for ${member.username}`} icon={<EllipsisVertical className="size-5" aria-hidden="true" />} />
                                                )}
                                            >
                                                <MenuItem icon={<Shield />} onSelect={() => openAction({ type: 'role', member })}>Change role</MenuItem>
                                                {/* The Owner can change their own role, but can't transfer to or kick themselves. */}
                                                {!member.isOwner && (<>
                                                <MenuItem
                                                    icon={<ArrowRightLeft />}
                                                    disabled={member.role !== 'Officer'}
                                                    hint={member.role !== 'Officer' ? 'Make them an Officer first' : undefined}
                                                    onSelect={() => openAction({ type: 'transfer', member })}
                                                >
                                                    Transfer ownership
                                                </MenuItem>
                                                <MenuSeparator />
                                                <MenuItem icon={<UserMinus />} tone="danger" onSelect={() => openAction({ type: 'kick', member })}>Kick player</MenuItem>
                                                </>)}
                                            </Menu>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            <Card className="mt-6">
                <CardHeader title="Team settings" />
                <div className="divide-y divide-line border-t border-line">
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="font-semibold text-fg">Leave team</p>
                            <p className="text-sm break-words text-fg-subtle">
                                {isOwner
                                    ? 'You own this team. Transfer ownership to an Officer or delete the team before leaving.'
                                    : `You lose access to ${team.name}. You can only rejoin with a new invite.`}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            className="shrink-0"
                            onClick={() => openTeamAction('leave')}
                            disabled={isOwner}
                            title={isOwner ? 'Transfer ownership or delete the team first' : undefined}
                            leftIcon={<LogOut className="size-4" aria-hidden="true" />}
                        >
                            Leave team
                        </Button>
                    </div>
                    {isOwner && (
                        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="font-semibold text-fg">Delete team</p>
                                <p className="text-sm text-fg-subtle">Permanently deletes the team with its roster, invites, matches and calendar events.</p>
                            </div>
                            <Button
                                variant="danger"
                                className="shrink-0"
                                onClick={() => openTeamAction('delete')}
                                leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                            >
                                Delete team
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            <InviteDialog
                open={isInviteOpen}
                teamId={team.id}
                onClose={() => setIsInviteOpen(false)}
                onInvited={email => {
                    toast.success(`Invite sent to ${email}.`);
                    reload();
                }}
            />

            <ConfirmDialog
                open={action?.type === 'kick'}
                onClose={closeAction}
                onConfirm={() => action && executeKick(action.member)}
                title="Kick player"
                confirmLabel="Kick player"
                busyLabel="Removing..."
                busy={isSubmitting}
                error={actionError}
            >
                Remove <strong className="text-fg">{action?.member.username}</strong> from the team? They will lose access to team data.
            </ConfirmDialog>

            <ConfirmDialog
                open={action?.type === 'transfer'}
                onClose={closeAction}
                onConfirm={() => action && executeTransfer(action.member)}
                title="Transfer ownership"
                confirmLabel="Transfer"
                busyLabel="Transferring..."
                busy={isSubmitting}
                error={actionError}
                confirmationText="CONFIRM"
            >
                You are about to transfer full team ownership to <strong className="text-fg">{action?.member.username}</strong>. You keep your role ({team.currentUserRole}) but lose Owner privileges, including managing roles and the roster.
            </ConfirmDialog>

            <ConfirmDialog
                open={teamAction === 'leave'}
                onClose={() => setTeamAction(null)}
                onConfirm={executeLeaveTeam}
                title="Leave team"
                confirmLabel="Leave team"
                busyLabel="Leaving..."
                busy={isSubmitting}
                error={actionError}
            >
                Are you sure you want to leave <strong className="text-fg">{team.name}</strong>? You will need a new invite to rejoin.
            </ConfirmDialog>

            <ConfirmDialog
                open={teamAction === 'delete'}
                onClose={() => setTeamAction(null)}
                onConfirm={executeDeleteTeam}
                title="Delete team"
                confirmLabel="Delete team"
                busyLabel="Deleting..."
                busy={isSubmitting}
                error={actionError}
                confirmationText={team.name}
            >
                This permanently deletes <strong className="text-fg">{team.name}</strong> with its roster, pending invites, matches and calendar events. This cannot be undone.
            </ConfirmDialog>

            <Modal
                open={action?.type === 'role'}
                onClose={closeAction}
                title={`Change role: ${action?.member.username ?? ''}`}
                size="sm"
                busy={isSubmitting}
                footer={
                    <>
                        <Button variant="ghost" onClick={closeAction} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={() => action && executeRoleChange(action.member)} loading={isSubmitting} loadingText="Saving...">Save role</Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    {actionError && <Alert tone="danger">{actionError}</Alert>}
                    <Field label="Role" hint="A team has one Captain and any number of Officers, who have the same rights as the Captain. The Owner keeps Owner rights whatever their role. Ownership can only be transferred to an Officer.">
                        <Select
                            value={newRole}
                            onChange={setNewRole}
                            options={ASSIGNABLE_ROLES.map(role => ({ value: role, label: role }))}
                            data-autofocus
                        />
                    </Field>
                </div>
            </Modal>
        </PageContainer>
    );
}

function RosterSkeleton() {
    return (
        <LoadingRegion label="Loading players" className="divide-y divide-line">
            {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 p-4">
                    <Skeleton className="size-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16 shrink-0" />
                </div>
            ))}
        </LoadingRegion>
    );
}

interface InviteDialogProps {
    open: boolean;
    teamId: number;
    onClose: () => void;
    onInvited: (email: string) => void;
}

function InviteDialog({ open, teamId, onClose, onInvited }: InviteDialogProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const close = () => {
        setEmail('');
        setError('');
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const address = email.trim();
        if (!address) return;

        setError('');
        setIsSending(true);
        try {
            await api.post(`/Teams/${teamId}/members`, { userEmail: address });
            onInvited(address);
            close();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to invite this player.'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={close}
            title="Invite player"
            size="sm"
            busy={isSending}
            closeOnBackdrop={false}
            footer={
                <>
                    <Button variant="ghost" onClick={close} disabled={isSending}>Cancel</Button>
                    <Button type="submit" form="invite-form" disabled={!email.trim()} loading={isSending} loadingText="Sending..." leftIcon={<MailPlus className="size-4" aria-hidden="true" />}>
                        Send invite
                    </Button>
                </>
            }
        >
            <form id="invite-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <Alert tone="danger">{error}</Alert>}
                <Field label="Email address" hint="They'll see the invite the next time they open Roster Sensei.">
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="player@example.com" autoComplete="off" required data-autofocus />
                </Field>
            </form>
        </Modal>
    );
}
