import {
    columnFilteringFeature,
    columnOrderingFeature,
    columnResizingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    constructFilterFn,
    createColumnHelper,
    createFilteredRowModel,
    createSortedRowModel,
    filterFn_equalsString,
    filterFn_includesString,
    rowSortingFeature,
    sortFn_basic,
    sortFn_datetime,
    sortFn_text,
    tableFeatures,
    type ColumnOrderState,
    type ColumnSizingState,
    type ColumnVisibilityState,
    type SortingState,
} from '@tanstack/react-table';
import { type Match } from '../types';

// One row per map. A match without maps still gets a single row so it shows up.
export interface MapRow {
    id: string;
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

const half = (ours?: number | null, theirs?: number | null) => (ours == null || theirs == null ? '' : `${ours}-${theirs}`);

export const toRows = (matches: Match[]): MapRow[] =>
    matches
        .filter(m => m.status === 'Finished')
        .flatMap(match => {
            const base = {
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
                    ...base, id: `${match.id}`, mapNumber: null, map: '', result: match.matchOutcome, roundsWon: null, roundsLost: null,
                    roundDiff: null, firstHalf: '', secondHalf: '', overtime: null,
                }];
            }

            return match.maps.map((map, index): MapRow => {
                const played = map.ourScore != null && map.opponentScore != null;
                const hasHalves = map.ourFirstHalf != null && map.opponentFirstHalf != null && map.ourSecondHalf != null && map.opponentSecondHalf != null;
                const regulation = hasHalves ? map.ourFirstHalf! + map.opponentFirstHalf! + map.ourSecondHalf! + map.opponentSecondHalf! : null;
                return {
                    ...base,
                    id: `${match.id}-${index + 1}`,
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

export const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatYesNo = (value: boolean | null) => (value == null ? '' : value ? 'Yes' : 'No');

/**
 * Number filters take what you'd type in a spreadsheet: `13`, `>10`, `<=5` or a range like `5-10`.
 * Unparseable input matches nothing, so a typo doesn't look like an empty result set.
 */
export const parseNumberFilter = (input: string): ((value: number) => boolean) | null => {
    const text = input.replace(/\s+/g, '');
    if (!text) return null;
    const range = /^(-?\d+(?:\.\d+)?)(?:-|\.\.)(-?\d+(?:\.\d+)?)$/.exec(text);
    if (range) {
        const [low, high] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
        return value => value >= low && value <= high;
    }
    const comparison = /^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/.exec(text);
    if (!comparison) return () => false;
    const target = Number(comparison[2]);
    switch (comparison[1]) {
        case '>': return value => value > target;
        case '>=': return value => value >= target;
        case '<': return value => value < target;
        case '<=': return value => value <= target;
        default: return value => value === target;
    }
};

const numberExpression = constructFilterFn({
    filter: (value: unknown, test: ((value: number) => boolean) | null) => (test ? typeof value === 'number' && test(value) : true),
    resolveFilterValue: (input: unknown) => parseNumberFilter(String(input ?? '')),
    autoRemove: (input: unknown) => String(input ?? '').trim() === '',
});

// Dates are filtered as they're shown, so "Oct" or "2026" both work.
const dateText = constructFilterFn({
    ...filterFn_includesString,
    resolveDataValue: (value: unknown) => (value instanceof Date ? formatDate(value).toLowerCase() : ''),
});

const yesNo = constructFilterFn({
    ...filterFn_equalsString,
    resolveDataValue: (value: unknown) => formatYesNo(value as boolean | null).toLowerCase(),
});

export interface ScrimColumnMeta {
    /** The name used in the column picker and filter labels. */
    label: string;
    filter: 'text' | 'number' | 'select';
    /** Choices for a `select` filter. */
    options?: string[];
    numeric?: boolean;
}

/** Only the grid behaviour this table uses, so nothing else ends up in the bundle. */
export const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    columnOrderingFeature,
    columnVisibilityFeature,
    columnSizingFeature,
    columnResizingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    filterFns: { includesString: filterFn_includesString, equalsString: filterFn_equalsString, numberExpression, dateText, yesNo },
    sortFns: { basic: sortFn_basic, text: sortFn_text, datetime: sortFn_datetime },
    columnMeta: {} as ScrimColumnMeta,
});

const helper = createColumnHelper<typeof features, MapRow>();
const RESULTS = ['Win', 'Loss', 'Draw', 'Not played'];

const text = (label: string) => ({ header: label, filterFn: 'includesString' as const, sortFn: 'text' as const, meta: { label, filter: 'text' as const } });
const number = (label: string) => ({ header: label, filterFn: 'numberExpression' as const, sortFn: 'basic' as const, sortUndefined: 'last' as const, meta: { label, filter: 'number' as const, numeric: true } });
const choice = (label: string, options: string[]) => ({ header: label, filterFn: 'equalsString' as const, sortFn: 'text' as const, meta: { label, filter: 'select' as const, options } });

export const columns = helper.columns([
    helper.accessor('date', {
        header: 'Date', size: 140, filterFn: 'dateText', sortFn: 'datetime', sortDescFirst: true,
        cell: info => formatDate(info.getValue()),
        meta: { label: 'Date', filter: 'text' },
    }),
    helper.accessor('opponent', { ...text('Opponent'), size: 180 }),
    helper.accessor('type', { ...choice('Type', ['Scrim', 'Official']), size: 110 }),
    helper.accessor('tournament', { ...text('Tournament'), size: 160 }),
    helper.accessor('map', { ...text('Map'), size: 120 }),
    helper.accessor('mapNumber', { ...number('Map #'), size: 90 }),
    helper.accessor('result', { ...choice('Map result', RESULTS), size: 130 }),
    helper.accessor('roundsWon', { ...number('Rounds won'), size: 140 }),
    helper.accessor('roundsLost', { ...number('Rounds lost'), size: 140 }),
    helper.accessor('roundDiff', {
        ...number('Round diff'), size: 130,
        cell: info => {
            const value = info.getValue();
            return value == null ? '' : value > 0 ? `+${value}` : `${value}`;
        },
    }),
    helper.accessor('firstHalf', { ...text('1st half'), size: 100, enableSorting: false }),
    helper.accessor('secondHalf', { ...text('2nd half'), size: 100, enableSorting: false }),
    helper.accessor('overtime', {
        header: 'OT', size: 90, filterFn: 'yesNo', sortFn: 'basic', sortUndefined: 'last',
        cell: info => formatYesNo(info.getValue()),
        meta: { label: 'Overtime', filter: 'select', options: ['Yes', 'No'] },
    }),
    helper.accessor('bestOf', {
        ...number('Format'), size: 100,
        cell: info => (info.getValue() ? `Bo${info.getValue()}` : ''),
    }),
    helper.accessor('seriesScore', { ...text('Series'), size: 100, enableSorting: false }),
    helper.accessor('seriesOutcome', { ...choice('Series result', ['Win', 'Loss', 'Draw']), size: 130 }),
]);

/** The parts of the table a user arranges, saved per browser. */
export interface TableLayout {
    sorting: SortingState;
    columnOrder: ColumnOrderState;
    columnVisibility: ColumnVisibilityState;
    columnSizing: ColumnSizingState;
}

export const DEFAULT_LAYOUT: TableLayout = {
    sorting: [{ id: 'date', desc: true }],
    columnOrder: columns.map(column => String(column.id ?? ('accessorKey' in column ? column.accessorKey : ''))),
    columnVisibility: { tournament: false, mapNumber: false },
    columnSizing: {},
};

const LAYOUT_KEY = 'scrim-analytics-layout';
// The AG Grid layout used a different format.
const LEGACY_LAYOUT_KEY = 'scrim-analytics-columns';

export const loadLayout = (): TableLayout => {
    try {
        localStorage.removeItem(LEGACY_LAYOUT_KEY);
        const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null') as Partial<TableLayout> | null;
        if (!saved) return DEFAULT_LAYOUT;
        // Keep saved columns that still exist, and add any new ones at the end.
        const known = new Set(DEFAULT_LAYOUT.columnOrder);
        const order = (saved.columnOrder ?? []).filter(id => known.has(id));
        return {
            sorting: saved.sorting ?? DEFAULT_LAYOUT.sorting,
            columnOrder: [...order, ...DEFAULT_LAYOUT.columnOrder.filter(id => !order.includes(id))],
            columnVisibility: { ...DEFAULT_LAYOUT.columnVisibility, ...saved.columnVisibility },
            columnSizing: saved.columnSizing ?? {},
        };
    } catch {
        return DEFAULT_LAYOUT;
    }
};

export const saveLayout = (layout: TableLayout | null) => {
    try {
        if (layout) localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        else localStorage.removeItem(LAYOUT_KEY);
    } catch {
        // Storage can be blocked (private mode); the layout just won't be remembered.
    }
};
