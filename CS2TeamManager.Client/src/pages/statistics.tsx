import { useCallback, useState } from 'react';
import api from '../services/api';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import PageHeader, { PageContainer } from '../components/page-header';
import { PanelSkeleton, StatsSkeleton } from '../components/page-skeletons';
import ScrimAnalytics, { type MatchTypeFilter } from '../components/scrim-analytics';
import TeamCharts from '../components/team-charts';
import TeamGate from '../components/team-gate';
import { Alert, Card, ErrorState, LoadingRegion, SegmentedControl } from '../components/ui';
import { type Match, type Team, type TeamStats } from '../types';

type TypeFilter = MatchTypeFilter;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Scrim', label: 'Scrims' },
    { value: 'Official', label: 'Official' },
];

export default function Statistics() {
    return (
        <TeamGate title="Statistics">
            {team => <StatisticsContent key={team.id} team={team} />}
        </TeamGate>
    );
}

function StatisticsContent({ team }: { team: Team }) {
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

    const loadMatches = useCallback<ResourceLoader<Match[]>>(
        signal => api.get<Match[]>(`/Matches/${team.id}`, { signal }).then(response => response.data),
        [team.id],
    );
    const matches = useResource(loadMatches, 'Failed to load matches.');

    // Map win rates are grouped on the server, so they're refetched when the type filter changes.
    const loadStats = useCallback<ResourceLoader<TeamStats>>(
        signal => api.get<TeamStats>(`/Matches/${team.id}/stats`, { signal, params: typeFilter === 'all' ? {} : { type: typeFilter } }).then(response => response.data),
        [team.id, typeFilter],
    );
    const stats = useResource(loadStats, 'Failed to load statistics.', { keepPrevious: true });

    return (
        <PageContainer>
            <PageHeader title="Statistics" description="How your team performs, per map and over time." />

            <SegmentedControl label="Match type" hideLabel value={typeFilter} options={TYPE_FILTERS} onChange={setTypeFilter} className="mb-6" />

            <div aria-busy={stats.isFetching} className="mb-8">
                {stats.isLoading ? (
                    <LoadingRegion label="Loading statistics" className="flex flex-col gap-6">
                        <StatsSkeleton />
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <PanelSkeleton height="h-80" />
                            <PanelSkeleton height="h-80" />
                        </div>
                    </LoadingRegion>
                ) : stats.error && !stats.data ? (
                    <Card><ErrorState title="Couldn't load statistics" message={stats.error} onRetry={stats.reload} retrying={stats.isFetching} /></Card>
                ) : stats.data && (
                    <div className="flex flex-col gap-4">
                        {stats.error && <Alert tone="danger">{stats.error}</Alert>}
                        <TeamCharts stats={stats.data} />
                    </div>
                )}
            </div>

            <ScrimAnalytics matches={matches} typeFilter={typeFilter} />
        </PageContainer>
    );
}
