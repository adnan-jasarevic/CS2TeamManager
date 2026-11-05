import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    CellStyleModule,
    ClientSideRowModelModule,
    ColumnApiModule,
    DateFilterModule,
    NumberFilterModule,
    TextFilterModule,
    ValidationModule,
    ModuleRegistry,
    colorSchemeDark,
    colorSchemeLight,
    themeQuartz,
    type CellStyle,
    type ColDef,
    type ColumnState,
    type GridApi,
    type GridReadyEvent,
} from 'ag-grid-community';
import { Columns3, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { useResource, type ResourceLoader } from '../hooks/use-resource';
import { useTheme } from '../theme/theme-context';
import PageHeader, { PageContainer } from '../components/page-header';
import { PanelSkeleton, StatsSkeleton } from '../components/page-skeletons';
import TeamCharts from '../components/team-charts';
import TeamGate from '../components/team-gate';
import { Alert, Button, Card, Checkbox, ErrorState, LoadingRegion, Popover, SegmentedControl } from '../components/ui';
import { type Match, type Team, type TeamStats } from '../types';

// Only the grid features this page uses, to keep the bundle small.
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ColumnApiModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CellStyleModule,
    // Explains setup mistakes in the console during development only.
    ...(import.meta.env.DEV ? [ValidationModule] : []),
]);

// The colours come from the design tokens, so the grid follows the rest of the theme.
const gridParams = {
    backgroundColor: 'var(--rs-surface)',
    headerBackgroundColor: 'var(--rs-sunken)',
    oddRowBackgroundColor: 'var(--rs-surface)',
    borderColor: 'var(--rs-line)',
    accentColor: 'var(--rs-accent)',
    foregroundColor: 'var(--rs-fg)',
    fontFamily: 'inherit',
    fontSize: 13,
};
const GRID_THEMES = {
    dark: themeQuartz.withPart(colorSchemeDark).withParams(gridParams),
    light: themeQuartz.withPart(colorSchemeLight).withParams(gridParams),
};

// One row per map. A match without maps still gets a single row so it shows up.
interface MapRow {
    matchId: number;
    date: Date;
    opponent: string;
    type: string;
    tournament: string;
    bestOf: number | null;
    seriesScore: string;
    seriesOutcome: string;
    mapNumber: number | null;
    map: string;
    result: string;
    roundsWon: number | null;
    roundsLost: number | null;
    roundDiff: number | null;
    firstHalf: string;
    secondHalf: string;
    overtime: boolean | null;
}

type TypeFilter = 'all' | 'Scrim' | 'Official';

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Scrim', label: 'Scrims' },
    { value: 'Official', label: 'Official' },
];

const COLUMN_STATE_KEY = 'scrim-analytics-columns';

const half = (ours?: number | null, theirs?: number | null) => (ours == null || theirs == null ? '' : `${ours}-${theirs}`);

const toRows = (matches: Match[]): MapRow[] =>
    matches
        .filter(m => m.status === 'Finished')
        .flatMap(match => {
            const base = {
                matchId: match.id,
                date: new Date(match.playedDate ?? match.scheduledDate),
                opponent: match.opponentName,
                type: match.type,
                tournament: match.tournament ?? '',
                bestOf: match.bestOf ?? null,
                seriesScore: match.finalScore,
                seriesOutcome: match.matchOutcome,
            };

            if (match.maps.length === 0) {
                return [{
                    ...base, mapNumber: null, map: '', result: match.matchOutcome, roundsWon: null, roundsLost: null,
                    roundDiff: null, firstHalf: '', secondHalf: '', overtime: null,
                }];
            }

            return match.maps.map((map, index): MapRow => {
                const played = map.ourScore != null && map.opponentScore != null;
                const hasHalves = map.ourFirstHalf != null && map.opponentFirstHalf != null && map.ourSecondHalf != null && map.opponentSecondHalf != null;
                const regulation = hasHalves ? map.ourFirstHalf! + map.opponentFirstHalf! + map.ourSecondHalf! + map.opponentSecondHalf! : null;
                return {
                    ...base,
                    mapNumber: index + 1,
                    map: map.mapName,
                    result: !played ? 'Not played' : map.ourScore! > map.opponentScore! ? 'Win' : map.ourScore! < map.opponentScore! ? 'Loss' : 'Draw',
                    roundsWon: played ? map.ourScore! : null,
                    roundsLost: played ? map.opponentScore! : null,
                    roundDiff: played ? map.ourScore! - map.opponentScore! : null,
                    firstHalf: half(map.ourFirstHalf, map.opponentFirstHalf),
                    secondHalf: half(map.ourSecondHalf, map.opponentSecondHalf),
                    overtime: played && regulation !== null ? map.ourScore! + map.opponentScore! > regulation : null,
                };
            });
        });

const resultStyle = (value: string): CellStyle => {
    if (value === 'Win') return { color: 'var(--rs-success-text)', fontWeight: 600 };
    if (value === 'Loss') return { color: 'var(--rs-danger-text)', fontWeight: 600 };
    return { color: 'var(--rs-fg-muted)', fontWeight: 400 };
};

const columnDefs: ColDef<MapRow>[] = [
    {
        field: 'date',
        headerName: 'Date',
        filter: 'agDateColumnFilter',
        sort: 'desc',
        valueFormatter: p => (p.value ? (p.value as Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''),
    },
    { field: 'opponent', headerName: 'Opponent' },
    { field: 'type', headerName: 'Type', width: 110 },
    { field: 'tournament', headerName: 'Tournament', hide: true },
    { field: 'map', headerName: 'Map', width: 120 },
    { field: 'mapNumber', headerName: 'Map #', filter: 'agNumberColumnFilter', width: 100, hide: true },
    { field: 'result', headerName: 'Map result', width: 130, cellStyle: p => resultStyle(p.value) },
    { field: 'roundsWon', headerName: 'Rounds won', filter: 'agNumberColumnFilter', width: 130 },
    { field: 'roundsLost', headerName: 'Rounds lost', filter: 'agNumberColumnFilter', width: 130 },
    {
        field: 'roundDiff',
        headerName: 'Round diff',
        filter: 'agNumberColumnFilter',
        width: 120,
        valueFormatter: p => (p.value == null ? '' : p.value > 0 ? `+${p.value}` : `${p.value}`),
    },
    { field: 'firstHalf', headerName: '1st half', width: 110 },
    { field: 'secondHalf', headerName: '2nd half', width: 110 },
    {
        field: 'overtime',
        headerName: 'OT',
        width: 90,
        valueFormatter: p => (p.value == null ? '' : p.value ? 'Yes' : 'No'),
        filterValueGetter: p => (p.data?.overtime == null ? '' : p.data.overtime ? 'Yes' : 'No'),
    },
    { field: 'bestOf', headerName: 'Format', width: 100, valueFormatter: p => (p.value ? `Bo${p.value}` : '') },
    { field: 'seriesScore', headerName: 'Series', width: 100 },
    { field: 'seriesOutcome', headerName: 'Series result', width: 130, cellStyle: p => resultStyle(p.value) },
];

const defaultColDef: ColDef<MapRow> = {
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    minWidth: 90,
};

const loadColumnState = (): ColumnState[] | null => {
    try {
        const saved = localStorage.getItem(COLUMN_STATE_KEY);
        return saved ? (JSON.parse(saved) as ColumnState[]) : null;
    } catch {
        return null;
    }
};

const saveColumnState = (state: ColumnState[]) => {
    try {
        localStorage.setItem(COLUMN_STATE_KEY, JSON.stringify(state));
    } catch {
        // Storage can be blocked (private mode); the layout just won't be remembered.
    }
};

export default function Statistics() {
    return (
        <TeamGate title="Statistics">
            {team => <StatisticsContent key={team.id} team={team} />}
        </TeamGate>
    );
}

function StatisticsContent({ team }: { team: Team }) {
    const { theme } = useTheme();
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [columnState, setColumnState] = useState<ColumnState[]>([]);
    const gridApi = useRef<GridApi<MapRow> | null>(null);

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

    const rows = useMemo(() => {
        const all = toRows(matches.data ?? []);
        return typeFilter === 'all' ? all : all.filter(r => r.type === typeFilter);
    }, [matches.data, typeFilter]);

    const syncColumnState = () => {
        if (gridApi.current) setColumnState(gridApi.current.getColumnState());
    };

    const onGridReady = (event: GridReadyEvent<MapRow>) => {
        gridApi.current = event.api;
        const saved = loadColumnState();
        if (saved) event.api.applyColumnState({ state: saved, applyOrder: true });
        syncColumnState();
    };

    const persistColumns = () => {
        if (gridApi.current) saveColumnState(gridApi.current.getColumnState());
        syncColumnState();
    };

    const resetLayout = () => {
        gridApi.current?.resetColumnState();
        try {
            localStorage.removeItem(COLUMN_STATE_KEY);
        } catch {
            // ignore
        }
        syncColumnState();
    };

    const toggleColumn = (colId: string, visible: boolean) => {
        gridApi.current?.setColumnsVisible([colId], visible);
        persistColumns();
    };

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

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl font-black tracking-tight text-fg">Scrim analytics</h2>
                    <p className="text-sm text-fg-subtle">Every played map, one row each. Drag headers to reorder, filter under each header, and pick columns.</p>
                </div>

                <div className="flex gap-2">
                    <Popover
                        label="Choose visible columns"
                        className="w-56"
                        renderTrigger={trigger => (
                            <Button {...trigger} variant="secondary" size="sm" leftIcon={<Columns3 className="size-4" aria-hidden="true" />}>Columns</Button>
                        )}
                    >
                        {columnDefs.map(col => {
                            const colId = col.field as string;
                            const saved = columnState.find(state => state.colId === colId);
                            return (
                                <Checkbox
                                    key={colId}
                                    label={col.headerName}
                                    checked={saved ? !saved.hide : !col.hide}
                                    onChange={(e) => toggleColumn(colId, e.target.checked)}
                                />
                            );
                        })}
                    </Popover>
                    <Button variant="ghost" size="sm" onClick={resetLayout} leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}>Reset layout</Button>
                </div>
            </div>

            {matches.error && !matches.data ? (
                <Card><ErrorState title="Couldn't load matches" message={matches.error} onRetry={matches.reload} retrying={matches.isFetching} /></Card>
            ) : (
                <div className="h-[600px] max-h-[80dvh] overflow-hidden rounded-lg">
                    <AgGridReact<MapRow>
                        theme={GRID_THEMES[theme]}
                        rowData={rows}
                        loading={matches.isLoading}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onGridReady={onGridReady}
                        onColumnMoved={(e) => { if (e.finished) persistColumns(); }}
                        onColumnResized={(e) => { if (e.finished) persistColumns(); }}
                        onSortChanged={persistColumns}
                        overlayNoRowsTemplate="No played matches yet. Finished matches show up here, one row per map."
                    />
                </div>
            )}
        </PageContainer>
    );
}
