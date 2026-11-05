import { useCallback, useState } from 'react';
import { CalendarDays, CalendarPlus, Percent, Plus, Swords, Trophy, Users } from 'lucide-react';
import api from '../services/api';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import { formatDate, formatTime } from '../lib/format';
import { type MatchResponse, type Team, type TeamDashboardData, canManageTeam } from '../types';
import AddMatchModal from '../components/add-match-modal';
import CreateTeamModal from '../components/create-team-modal';
import { OutcomeBadge } from '../components/domain-badges';
import { useLayoutContext } from '../components/layout-context';
import PageHeader, { PageContainer } from '../components/page-header';
import { ListSkeleton, StatsSkeleton } from '../components/page-skeletons';
import TeamGate from '../components/team-gate';
import { Alert, Button, Card, CardHeader, EmptyState, ErrorState, LinkButton, StatGrid, StatTile, useToast } from '../components/ui';

export default function Dashboard() {
    const { selectTeam, reloadTeams } = useLayoutContext();
    const toast = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    return (
        <>
            <TeamGate
                title="Dashboard"
                noTeams={
                    <PageContainer>
                        <PageHeader title="Dashboard" description="Welcome! Get started by creating your first team." />
                        <Card>
                            <EmptyState
                                icon={<Users />}
                                title="You're not on a team yet"
                                description="Create a team and invite your players, or accept an invite from a teammate."
                                action={<Button size="lg" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="size-5" aria-hidden="true" />}>Create a team</Button>}
                            />
                        </Card>
                    </PageContainer>
                }
            >
                {team => <DashboardContent key={team.id} team={team} onCreateTeam={() => setIsCreateOpen(true)} />}
            </TeamGate>

            {isCreateOpen && (
                <CreateTeamModal
                    onClose={() => setIsCreateOpen(false)}
                    onCreated={team => {
                        selectTeam(team.id);
                        reloadTeams();
                        toast.success(`${team.name} is ready. Invite your players next.`);
                    }}
                />
            )}
        </>
    );
}

function DashboardContent({ team, onCreateTeam }: { team: Team; onCreateTeam: () => void }) {
    const load = useCallback<ResourceLoader<TeamDashboardData>>(
        signal => api.get<TeamDashboardData>(`/Teams/${team.id}/dashboard`, { signal }).then(response => response.data),
        [team.id],
    );
    const { data, error, isLoading, isFetching, reload } = useResource(load, 'Failed to load team statistics.');
    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
    const canManageMatches = canManageTeam(team);

    return (
        <PageContainer>
            <PageHeader
                title="Dashboard"
                description={<>Here's how <span className="font-semibold text-fg">{team.name}</span> is doing.</>}
                actions={
                    <>
                        <Button variant="secondary" onClick={onCreateTeam} leftIcon={<Plus className="size-4" aria-hidden="true" />}>New team</Button>
                        {canManageMatches && (
                            <Button onClick={() => setIsAddMatchOpen(true)} leftIcon={<Swords className="size-4" aria-hidden="true" />}>Add match</Button>
                        )}
                    </>
                }
            />

            {isLoading && (
                <div className="flex flex-col gap-6">
                    <StatsSkeleton />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card><ListSkeleton label="Loading recent matches" /></Card>
                        <Card><ListSkeleton label="Loading upcoming matches" /></Card>
                    </div>
                </div>
            )}

            {error && !data && (
                <Card>
                    <ErrorState title="Couldn't load this team" message={error} onRetry={reload} retrying={isFetching} />
                </Card>
            )}

            {data && (
                <div className="flex flex-col gap-6">
                    {error && <Alert tone="danger">{error}</Alert>}

                    <StatGrid>
                        <StatTile label="Total matches" value={data.totalMatches} icon={<Trophy />} />
                        <StatTile label="Win rate" value={`${data.winRatePercentage}%`} icon={<Percent />} />
                        <StatTile label="Team members" value={data.totalMembers} icon={<Users />} />
                        <StatTile label="Upcoming" value={data.upcomingMatchesCount} icon={<CalendarDays />} />
                    </StatGrid>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <MatchListCard
                            title="Recent matches"
                            matches={data.recentMatches}
                            emptyState={<EmptyState compact icon={<Swords />} title="No matches played yet" description="Finished matches show up here with their result." />}
                            renderLeading={match => <OutcomeBadge outcome={match.matchOutcome} />}
                            renderTrailing={match => <span className="font-display text-lg font-black whitespace-nowrap text-fg tabular-nums">{match.finalScore}</span>}
                            footerLink={<LinkButton to="/matches" fullWidth>View all matches</LinkButton>}
                        />

                        <MatchListCard
                            title="Upcoming matches"
                            matches={data.upcomingMatches}
                            emptyState={
                                <EmptyState
                                    compact
                                    icon={<CalendarPlus />}
                                    title="Nothing scheduled"
                                    description="Upcoming matches show up here with their start time."
                                    action={canManageMatches ? <Button size="sm" variant="secondary" onClick={() => setIsAddMatchOpen(true)}>Schedule a match</Button> : undefined}
                                />
                            }
                            renderTrailing={match => <span className="text-sm font-bold text-accent-text tabular-nums">{formatTime(match.scheduledDate)}</span>}
                            footerLink={<LinkButton to="/calendar" fullWidth>View calendar</LinkButton>}
                        />
                    </div>
                </div>
            )}

            {isAddMatchOpen && <AddMatchModal teamId={team.id} onClose={() => setIsAddMatchOpen(false)} onCreated={reload} />}
        </PageContainer>
    );
}

interface MatchListCardProps {
    title: string;
    matches: MatchResponse[];
    emptyState: React.ReactNode;
    renderLeading?: (match: MatchResponse) => React.ReactNode;
    renderTrailing: (match: MatchResponse) => React.ReactNode;
    footerLink: React.ReactNode;
}

function MatchListCard({ title, matches, emptyState, renderLeading, renderTrailing, footerLink }: MatchListCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader title={title} className="pb-2" />
            <div className="flex-1">
                {matches.length === 0 ? emptyState : (
                    <ul className="divide-y divide-line">
                        {matches.map(match => (
                            <li key={match.id} className="flex items-center gap-3 px-5 py-3">
                                {renderLeading?.(match)}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-fg">vs {match.opponentName}</p>
                                    <p className="text-xs text-fg-subtle">{formatDate(match.playedDate ?? match.scheduledDate)}</p>
                                </div>
                                <div className="shrink-0">{renderTrailing(match)}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="p-5 pt-3">{footerLink}</div>
        </Card>
    );
}
