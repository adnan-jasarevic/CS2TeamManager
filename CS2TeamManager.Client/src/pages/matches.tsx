import { useCallback, useState } from 'react';
import { CalendarPlus, Swords } from 'lucide-react';
import api from '../services/api';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import { cx } from '../lib/cx';
import { formatDateTime } from '../lib/format';
import { type Match, type MatchMap, type Team, canManageTeam } from '../types';
import AddMatchModal from '../components/add-match-modal';
import { MatchStatusBadge, OutcomeBadge } from '../components/domain-badges';
import PageHeader, { PageContainer } from '../components/page-header';
import { ListSkeleton } from '../components/page-skeletons';
import TeamGate from '../components/team-gate';
import { Alert, Button, Card, EmptyState, ErrorState, SegmentedControl } from '../components/ui';

type Filter = 'all' | 'upcoming' | 'results';

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'results', label: 'Results' },
];

const EMPTY_TITLES: Record<Filter, string> = {
    all: 'No matches yet',
    upcoming: 'Nothing scheduled',
    results: 'No results yet',
};

// "7-5, 6-6 +OT" style summary of a map's halves, or empty when halves weren't recorded.
const halvesText = (map: MatchMap) => {
    if (map.ourFirstHalf == null || map.opponentFirstHalf == null || map.ourSecondHalf == null || map.opponentSecondHalf == null)
        return '';
    const regulation = map.ourFirstHalf + map.ourSecondHalf + map.opponentFirstHalf + map.opponentSecondHalf;
    const total = (map.ourScore ?? 0) + (map.opponentScore ?? 0);
    const overtime = total > regulation ? ' +OT' : '';
    return `${map.ourFirstHalf}-${map.opponentFirstHalf}, ${map.ourSecondHalf}-${map.opponentSecondHalf}${overtime}`;
};

export default function Matches() {
    return (
        <TeamGate title="Matches">
            {team => <MatchesContent key={team.id} team={team} />}
        </TeamGate>
    );
}

function MatchesContent({ team }: { team: Team }) {
    const load = useCallback<ResourceLoader<Match[]>>(
        signal => api.get<Match[]>(`/Matches/${team.id}`, { signal }).then(response => response.data),
        [team.id],
    );
    const { data: matches, error, isLoading, isFetching, reload } = useResource(load, 'Failed to load matches.');
    const [filter, setFilter] = useState<Filter>('all');
    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
    const canManageMatches = canManageTeam(team.currentUserRole);

    // The API returns matches newest first.
    const visibleMatches = (matches ?? []).filter(m => {
        if (filter === 'upcoming') return m.status === 'Scheduled' || m.status === 'Live';
        if (filter === 'results') return m.status === 'Finished';
        return true;
    });

    return (
        <PageContainer>
            <PageHeader
                title="Matches"
                description="Every match your team has scheduled or played."
                actions={canManageMatches && (
                    <Button onClick={() => setIsAddMatchOpen(true)} leftIcon={<Swords className="size-4" aria-hidden="true" />}>Add match</Button>
                )}
            />

            <SegmentedControl label="Show" hideLabel value={filter} options={FILTERS} onChange={setFilter} className="mb-4" />

            {error && matches && <Alert tone="danger" className="mb-4">{error}</Alert>}

            <Card className="overflow-hidden">
                {isLoading ? (
                    <ListSkeleton rows={6} label="Loading matches" />
                ) : error && !matches ? (
                    <ErrorState title="Couldn't load matches" message={error} onRetry={reload} retrying={isFetching} />
                ) : visibleMatches.length === 0 ? (
                    <EmptyState
                        icon={<CalendarPlus />}
                        title={EMPTY_TITLES[filter]}
                        description="Matches appear here once they've been added."
                        action={canManageMatches ? <Button variant="secondary" onClick={() => setIsAddMatchOpen(true)}>Add a match</Button> : undefined}
                    />
                ) : (
                    <ul className="divide-y divide-line">
                        {visibleMatches.map(match => <MatchRow key={match.id} match={match} />)}
                    </ul>
                )}
            </Card>

            {isAddMatchOpen && <AddMatchModal teamId={team.id} onClose={() => setIsAddMatchOpen(false)} onCreated={reload} />}
        </PageContainer>
    );
}

function MatchRow({ match }: { match: Match }) {
    const isFinished = match.status === 'Finished';
    const details = [
        formatDateTime(match.scheduledDate),
        match.type === 'Scrim' && 'Scrim',
        match.tournament,
        match.bestOf && `Bo${match.bestOf}`,
    ].filter(Boolean).join(' · ');

    return (
        <li className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0">
                    {isFinished ? <OutcomeBadge outcome={match.matchOutcome} /> : <MatchStatusBadge status={match.status} />}
                </span>
                <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">vs {match.opponentName}</p>
                    <p className="text-xs break-words text-fg-subtle">{details}</p>
                </div>
                {isFinished && <span className="ml-auto shrink-0 pl-2 font-display text-lg font-black whitespace-nowrap text-fg tabular-nums md:hidden">{match.finalScore}</span>}
            </div>

            <div className="flex min-w-0 items-center gap-4 md:justify-end">
                {match.maps.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 md:justify-end">
                        {match.maps.map((map, index) => <MapChip key={`${map.mapName}-${index}`} map={map} />)}
                    </ul>
                )}
                {isFinished && <span className="hidden min-w-14 shrink-0 text-right font-display text-lg font-black whitespace-nowrap text-fg tabular-nums md:block">{match.finalScore}</span>}
            </div>
        </li>
    );
}

function MapChip({ map }: { map: MatchMap }) {
    const played = map.ourScore != null && map.opponentScore != null;
    const halves = halvesText(map);
    const scoreClass = !played || map.ourScore === map.opponentScore
        ? 'text-fg-muted'
        : map.ourScore! > map.opponentScore! ? 'text-success' : 'text-danger';

    return (
        <li className="rounded border border-line bg-sunken px-2 py-1 text-xs text-fg-muted">
            {map.mapName}
            {played && <span className={cx('ml-1.5 font-bold tabular-nums', scoreClass)}>{map.ourScore}-{map.opponentScore}</span>}
            {halves && <span className="ml-1.5 text-fg-subtle tabular-nums">({halves})</span>}
        </li>
    );
}
