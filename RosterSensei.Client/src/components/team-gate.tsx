import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import { type Team } from '../types';
import { useLayoutContext } from './layout-context';
import PageHeader, { PageContainer } from './page-header';
import { PageSkeleton } from './page-skeletons';
import { Card, EmptyState, ErrorState, LinkButton } from './ui';

export interface TeamGateProps {
    /** Used for the header of the loading, error and no-team screens. */
    title: string;
    /** Replaces the default "create or join a team" screen. */
    noTeams?: ReactNode;
    /** Only rendered once a team is selected, so pages never have to handle "no team". */
    children: (team: Team) => ReactNode;
}

/**
 * The states every team page shares, handled once. Give the content `key={team.id}` so switching
 * teams starts it fresh, with no state or data carried over from the previous team.
 */
export default function TeamGate({ title, noTeams, children }: TeamGateProps) {
    const { selectedTeam, teamsLoading, teamsError, reloadTeams } = useLayoutContext();

    if (teamsLoading) return <PageSkeleton label={`Loading ${title.toLowerCase()}`} />;

    if (teamsError && !selectedTeam) {
        return (
            <PageContainer>
                <PageHeader title={title} />
                <Card>
                    <ErrorState title="Couldn't load your teams" message={teamsError} onRetry={reloadTeams} />
                </Card>
            </PageContainer>
        );
    }

    if (!selectedTeam) {
        return noTeams ?? (
            <PageContainer>
                <PageHeader title={title} />
                <Card>
                    <EmptyState
                        icon={<Users />}
                        title="You're not on a team yet"
                        description="Create a team from the dashboard, or accept an invite from a teammate."
                        action={<LinkButton to="/dashboard" variant="primary">Go to dashboard</LinkButton>}
                    />
                </Card>
            </PageContainer>
        );
    }

    return <>{children(selectedTeam)}</>;
}
