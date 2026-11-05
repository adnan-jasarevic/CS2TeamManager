import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    themeQuartz,
    type CellStyle,
    type ColDef,
    type ColumnState,
    type GridApi,
    type GridReadyEvent,
} from 'ag-grid-community';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLayoutContext } from '../components/layout-context';
import TeamCharts from '../components/team-charts';
import { type Match, type Team, type TeamStats, roleLabel } from '../types';

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

const gridTheme = themeQuartz.withPart(colorSchemeDark).withParams({
    backgroundColor: '#181a2d',
    headerBackgroundColor: '#111322',
    oddRowBackgroundColor: '#1b1d32',
    borderColor: '#1f2937',
    accentColor: '#ff6b4a',
    foregroundColor: '#e5e7eb',
    fontSize: 13,
});

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
    if (value === 'Win') return { color: '#4ade80', fontWeight: 600 };
    if (value === 'Loss') return { color: '#f87171', fontWeight: 600 };
    return { color: '#9ca3af', fontWeight: 400 };
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
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [, setColumnsVersion] = useState(0);
    const gridApi = useRef<GridApi<MapRow> | null>(null);
    const { teamsVersion } = useLayoutContext();

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await api.get<Team[]>('/Teams/my-teams');
                setTeams(response.data);
                if (response.data.length > 0) setSelectedTeamId(prev => prev ?? response.data[0].id);
            } catch (err: unknown) {
                setError(getApiErrorMessage(err, 'Failed to load teams.'));
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, [teamsVersion]);

    const fetchMatches = useCallback(async (teamId: number) => {
        try {
            setError('');
            const response = await api.get<Match[]>(`/Matches/${teamId}`);
            setMatches(response.data);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to load matches.'));
        }
    }, []);

    useEffect(() => {
        if (selectedTeamId !== null) fetchMatches(selectedTeamId);
    }, [selectedTeamId, fetchMatches]);

    // Map win rates are grouped on the server, so they're refetched when the type filter changes.
    useEffect(() => {
        if (selectedTeamId === null) return;
        let cancelled = false;
        api.get<TeamStats>(`/Matches/${selectedTeamId}/stats`, { params: typeFilter === 'all' ? {} : { type: typeFilter } })
            .then(response => { if (!cancelled) setStats(response.data); })
            .catch((err: unknown) => { if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load statistics.')); });
        return () => { cancelled = true; };
    }, [selectedTeamId, typeFilter]);

    const rows = useMemo(() => {
        const all = toRows(matches);
        return typeFilter === 'all' ? all : all.filter(r => r.type === typeFilter);
    }, [matches, typeFilter]);

    const onGridReady = (event: GridReadyEvent<MapRow>) => {
        gridApi.current = event.api;
        const saved = loadColumnState();
        if (saved) event.api.applyColumnState({ state: saved, applyOrder: true });
        setColumnsVersion(v => v + 1);
    };

    const persistColumns = () => {
        if (gridApi.current) saveColumnState(gridApi.current.getColumnState());
        setColumnsVersion(v => v + 1);
    };

    const resetLayout = () => {
        gridApi.current?.resetColumnState();
        try {
            localStorage.removeItem(COLUMN_STATE_KEY);
        } catch {
            // ignore
        }
        setColumnsVersion(v => v + 1);
    };

    const toggleColumn = (colId: string, visible: boolean) => {
        gridApi.current?.setColumnsVisible([colId], visible);
        persistColumns();
    };

    if (loading) return <div className="text-gray-400 p-8">Loading analytics...</div>;

    if (teams.length === 0) {
        return (
            <div className="p-4 md:p-8">
                <h1 className="text-3xl font-bold text-white mb-2">Statistics</h1>
                <p className="text-gray-400">You need to create or join a team first.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Statistics</h1>
                    <p className="text-gray-400">How your team performs, per map and over time.</p>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">Select Team:</label>
                    <select
                        className="bg-[#181a2d] border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#ff6b4a]"
                        value={selectedTeamId || ''}
                        onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                    >
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({roleLabel(t)})</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">{error}</div>}

            <div className="flex gap-2 mb-6">
                {TYPE_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setTypeFilter(f.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${typeFilter === f.value
                            ? 'bg-[#ff6b4a] border-[#ff6b4a] text-white'
                            : 'bg-[#181a2d] border-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {stats && <TeamCharts stats={stats} />}

            <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Scrim Analytics</h2>
                    <p className="text-xs text-gray-500">Every played map, one row each. Drag headers to reorder, filter under each header, and pick columns.</p>
                </div>

                <div className="flex gap-2 relative">
                    <button
                        onClick={() => setIsColumnMenuOpen(open => !open)}
                        className="px-4 py-2 rounded-lg text-sm font-medium border bg-[#181a2d] border-gray-800 text-gray-300 hover:text-white"
                    >
                        Columns
                    </button>
                    <button
                        onClick={resetLayout}
                        className="px-4 py-2 rounded-lg text-sm font-medium border bg-[#181a2d] border-gray-800 text-gray-400 hover:text-white"
                    >
                        Reset layout
                    </button>

                    {isColumnMenuOpen && (
                        <div className="absolute right-0 top-12 z-20 w-56 bg-[#111322] border border-gray-700 rounded-lg shadow-xl p-2">
                            {columnDefs.map(col => {
                                const colId = col.field as string;
                                const visible = gridApi.current?.getColumn(colId)?.isVisible() ?? !col.hide;
                                return (
                                    <label key={colId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 text-sm text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visible}
                                            onChange={(e) => toggleColumn(colId, e.target.checked)}
                                            className="accent-[#ff6b4a]"
                                        />
                                        {col.headerName}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ height: 600 }}>
                <AgGridReact<MapRow>
                    theme={gridTheme}
                    rowData={rows}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    onGridReady={onGridReady}
                    onColumnMoved={(e) => { if (e.finished) persistColumns(); }}
                    onColumnResized={(e) => { if (e.finished) persistColumns(); }}
                    onSortChanged={persistColumns}
                    overlayNoRowsTemplate="No played matches yet. Finished matches show up here, one row per map."
                />
            </div>
        </div>
    );
}
