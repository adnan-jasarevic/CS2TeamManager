import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent } from 'react';
import { useTable, type Column, type Header } from '@tanstack/react-table';
import { useCreateAtom } from '@tanstack/react-store';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ChevronsUpDown, Columns3, FilterX, RotateCcw } from 'lucide-react';
import { type Resource } from '../hooks/use-resource';
import { cx } from '../lib/cx';
import { Button, Card, Checkbox, ErrorState, IconButton, Popover, Select } from './ui';
import { type Match } from '../types';
import { DEFAULT_LAYOUT, columns, features, loadLayout, saveLayout, toRows, type MapRow } from './scrim-analytics-model';

export type MatchTypeFilter = 'all' | 'Scrim' | 'Official';

type ScrimFeatures = typeof features;

interface ScrimAnalyticsProps {
    matches: Resource<Match[]>;
    typeFilter: MatchTypeFilter;
}

const RESIZE_STEP = 10;
const NO_ROWS: MapRow[] = [];

/** Every played map, one row each: sortable, filterable, with columns you can hide, move and resize. */
export default function ScrimAnalytics({ matches, typeFilter }: ScrimAnalyticsProps) {
    const rows = useMemo(() => {
        if (!matches.data) return NO_ROWS;
        const all = toRows(matches.data);
        return typeFilter === 'all' ? all : all.filter(r => r.type === typeFilter);
    }, [matches.data, typeFilter]);

    // The layout is saved per browser, so the app owns those slices as atoms. Filters stay with the table.
    const [savedLayout] = useState(loadLayout);
    const sorting = useCreateAtom(savedLayout.sorting);
    const columnOrder = useCreateAtom(savedLayout.columnOrder);
    const columnVisibility = useCreateAtom(savedLayout.columnVisibility);
    const columnSizing = useCreateAtom(savedLayout.columnSizing);

    useEffect(() => {
        const save = () => saveLayout({
            sorting: sorting.get(),
            columnOrder: columnOrder.get(),
            columnVisibility: columnVisibility.get(),
            columnSizing: columnSizing.get(),
        });
        const subscriptions = [
            sorting.subscribe(save),
            columnOrder.subscribe(save),
            columnVisibility.subscribe(save),
            columnSizing.subscribe(save),
        ];
        return () => subscriptions.forEach(subscription => subscription.unsubscribe());
    }, [sorting, columnOrder, columnVisibility, columnSizing]);

    const table = useTable(
        {
            features,
            columns,
            data: rows,
            getRowId: row => row.id,
            atoms: { sorting, columnOrder, columnVisibility, columnSizing },
            enableMultiSort: false,
            columnResizeMode: 'onChange',
            defaultColumn: { minSize: 80, maxSize: 480 },
        },
        state => ({
            sorting: state.sorting,
            columnFilters: state.columnFilters,
            columnOrder: state.columnOrder,
            columnVisibility: state.columnVisibility,
            columnSizing: state.columnSizing,
            columnResizing: state.columnResizing,
        }),
    );

    const resetLayout = () => {
        sorting.set(DEFAULT_LAYOUT.sorting);
        columnOrder.set(DEFAULT_LAYOUT.columnOrder);
        columnVisibility.set(DEFAULT_LAYOUT.columnVisibility);
        columnSizing.set(DEFAULT_LAYOUT.columnSizing);
    };

    const moveColumn = (id: string, targetId: string) => {
        if (id === targetId) return;
        const next = table.state.columnOrder.filter(columnId => columnId !== id);
        const targetIndex = next.indexOf(targetId);
        const fromIndex = table.state.columnOrder.indexOf(id);
        // Dropping onto a column further right places it after that column.
        next.splice(fromIndex <= targetIndex ? targetIndex + 1 : targetIndex, 0, id);
        table.setColumnOrder(next);
    };

    const shiftColumn = (id: string, by: -1 | 1) => {
        const order = table.state.columnOrder;
        const index = order.indexOf(id);
        const target = order[index + by];
        if (target) moveColumn(id, target);
    };

    const totalRows = table.getCoreRowModel().rows.length;
    const visibleRows = table.getRowModel().rows;
    const hasFilters = table.state.columnFilters.length > 0;
    const leafColumns = table.getAllLeafColumns();
    const visibleColumns = table.getVisibleLeafColumns();

    return (
        <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xl font-black tracking-tight text-fg">Scrim analytics</h2>
                    <p className="text-sm text-fg-subtle">Every played map, one row each. Drag headers to reorder, filter under each header, and pick columns.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters(true)} leftIcon={<FilterX className="size-4" aria-hidden="true" />}>Clear filters</Button>
                    )}
                    <Popover
                        label="Choose and order columns"
                        className="w-72"
                        renderTrigger={trigger => (
                            <Button {...trigger} variant="secondary" size="sm" leftIcon={<Columns3 className="size-4" aria-hidden="true" />}>Columns</Button>
                        )}
                    >
                        <ul className="flex flex-col">
                            {leafColumns.map((column, index) => {
                                const label = column.columnDef.meta?.label ?? column.id;
                                return (
                                    <li key={column.id} className="flex items-center gap-1">
                                        <Checkbox
                                            className="min-w-0 flex-1"
                                            label={label}
                                            checked={column.getIsVisible()}
                                            onChange={event => column.toggleVisibility(event.target.checked)}
                                        />
                                        <IconButton size="sm" label={`Move ${label} earlier`} icon={<ArrowUp className="size-4" />} disabled={index === 0} onClick={() => shiftColumn(column.id, -1)} />
                                        <IconButton size="sm" label={`Move ${label} later`} icon={<ArrowDown className="size-4" />} disabled={index === leafColumns.length - 1} onClick={() => shiftColumn(column.id, 1)} />
                                    </li>
                                );
                            })}
                        </ul>
                    </Popover>
                    <Button variant="ghost" size="sm" onClick={resetLayout} leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}>Reset layout</Button>
                </div>
            </div>

            {matches.error && !matches.data ? (
                <Card><ErrorState title="Couldn't load matches" message={matches.error} onRetry={matches.reload} retrying={matches.isFetching} /></Card>
            ) : (
                <>
                    <div
                        className="h-[600px] max-h-[80dvh] overflow-auto rounded-lg border border-line bg-surface"
                        aria-busy={matches.isLoading}
                        // Scrollable regions need to be reachable by keyboard.
                        tabIndex={0}
                        role="region"
                        aria-label="Scrim analytics table"
                    >
                        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: table.getTotalSize() }}>
                            <caption className="sr-only">Played maps, one row per map. Column headers sort the table.</caption>
                            <colgroup>
                                {visibleColumns.map(column => <col key={column.id} style={{ width: column.getSize() }} />)}
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-sunken">
                                {table.getHeaderGroups().map(group => (
                                    <tr key={group.id}>
                                        {group.headers.map(header => (
                                            <HeaderCell key={header.id} header={header} onMove={moveColumn} />
                                        ))}
                                    </tr>
                                ))}
                                <tr>
                                    {visibleColumns.map(column => (
                                        <td key={column.id} className="border-b border-line px-2 pb-2">
                                            <ColumnFilter column={column} />
                                        </td>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {matches.isLoading ? (
                                    <StatusRow span={visibleColumns.length}>Loading matches...</StatusRow>
                                ) : visibleRows.length === 0 ? (
                                    <StatusRow span={visibleColumns.length}>
                                        {totalRows === 0 ? 'No played matches yet. Finished matches show up here, one row per map.' : 'No maps match these filters.'}
                                    </StatusRow>
                                ) : visibleRows.map(row => (
                                    <tr key={row.id} className="hover:bg-hover">
                                        {row.getVisibleCells().map(cell => {
                                            const meta = cell.column.columnDef.meta;
                                            const value = cell.getValue();
                                            const isResult = cell.column.id === 'result' || cell.column.id === 'seriesOutcome';
                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={cx(
                                                        'truncate border-b border-line px-3 py-2.5',
                                                        meta?.numeric && 'text-right tabular-nums',
                                                        isResult && resultClass(value as string),
                                                    )}
                                                >
                                                    <table.FlexRender cell={cell} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!matches.isLoading && totalRows > 0 && (
                        <p className="mt-2 text-xs text-fg-subtle" aria-live="polite">
                            {hasFilters ? `Showing ${visibleRows.length} of ${totalRows} maps` : `${totalRows} ${totalRows === 1 ? 'map' : 'maps'}`}
                        </p>
                    )}
                </>
            )}
        </>
    );
}

const resultClass = (value: string) =>
    value === 'Win' ? 'font-semibold text-success' : value === 'Loss' ? 'font-semibold text-danger' : 'text-fg-muted';

function StatusRow({ span, children }: { span: number; children: string }) {
    return (
        <tr>
            <td colSpan={span} className="px-3 py-10 text-center text-fg-muted">{children}</td>
        </tr>
    );
}

function HeaderCell({ header, onMove }: { header: Header<ScrimFeatures, MapRow, unknown>; onMove: (id: string, targetId: string) => void }) {
    const [isDropTarget, setIsDropTarget] = useState(false);
    // A drag that starts on the resize handle resizes; anywhere else on the header moves the column.
    const [canDrag, setCanDrag] = useState(true);
    const { column } = header;
    const label = column.columnDef.meta?.label ?? column.id;
    const sorted = column.getIsSorted();
    const numeric = column.columnDef.meta?.numeric;

    const onDragStart = (event: DragEvent<HTMLTableCellElement>) => {
        event.dataTransfer.setData('text/x-column-id', column.id);
        event.dataTransfer.effectAllowed = 'move';
    };
    const onDragOver = (event: DragEvent<HTMLTableCellElement>) => {
        if (!event.dataTransfer.types.includes('text/x-column-id')) return;
        event.preventDefault();
        setIsDropTarget(true);
    };
    const onDrop = (event: DragEvent<HTMLTableCellElement>) => {
        event.preventDefault();
        setIsDropTarget(false);
        const id = event.dataTransfer.getData('text/x-column-id');
        if (id) onMove(id, column.id);
    };

    // Arrow keys resize from the keyboard; the drag handle covers mouse and touch.
    const onResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const delta = event.key === 'ArrowRight' ? RESIZE_STEP : event.key === 'ArrowLeft' ? -RESIZE_STEP : 0;
        if (!delta) return;
        event.preventDefault();
        const { minSize = 80, maxSize = 480 } = column.columnDef;
        const size = Math.min(maxSize, Math.max(minSize, column.getSize() + delta));
        header.getContext().table.setColumnSizing(current => ({ ...current, [column.id]: size }));
    };
    const resizeHandler = header.getResizeHandler();

    return (
        <th
            scope="col"
            aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
            draggable={canDrag}
            onPointerDown={event => setCanDrag(!(event.target as HTMLElement).closest('[role="separator"]'))}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={() => setIsDropTarget(false)}
            onDrop={onDrop}
            className={cx(
                'relative h-11 cursor-grab px-3 text-left font-semibold text-fg select-none active:cursor-grabbing',
                isDropTarget && 'shadow-[inset_2px_0_0_var(--rs-accent)]',
            )}
        >
            {column.getCanSort() ? (
                <button
                    type="button"
                    onClick={column.getToggleSortingHandler()}
                    className={cx('-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 rounded px-1 py-1 hover:text-accent-text', numeric && 'flex-row-reverse')}
                >
                    <span className="truncate">{label}</span>
                    {sorted === 'asc' ? <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
                        : sorted === 'desc' ? <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                            : <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />}
                </button>
            ) : (
                <span className={cx('block truncate', numeric && 'text-right')}>{label}</span>
            )}
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize ${label}`}
                aria-valuenow={column.getSize()}
                aria-valuemin={column.columnDef.minSize}
                aria-valuemax={column.columnDef.maxSize}
                tabIndex={0}
                onMouseDown={resizeHandler}
                onTouchStart={resizeHandler}
                onDoubleClick={() => column.resetSize()}
                onKeyDown={onResizeKeyDown}
                className={cx(
                    'absolute top-2 right-0 bottom-2 w-1.5 cursor-col-resize touch-none rounded-full',
                    'after:absolute after:inset-y-0 after:right-0.5 after:w-px after:bg-line-strong hover:after:bg-fg-subtle focus-visible:after:bg-fg',
                    column.getIsResizing() && 'after:bg-accent',
                )}
            />
        </th>
    );
}

function ColumnFilter({ column }: { column: Column<ScrimFeatures, MapRow, unknown> }) {
    const meta = column.columnDef.meta;
    if (!meta) return null;
    const value = (column.getFilterValue() as string | undefined) ?? '';
    const label = `Filter ${meta.label}`;
    const classes = 'h-8 w-full min-w-0 rounded border border-line-strong bg-canvas px-2 text-sm font-normal text-fg placeholder:text-fg-subtle focus:border-fg focus:outline-none';

    if (meta.filter === 'select') {
        return (
            <Select
                size="sm"
                aria-label={label}
                value={value}
                onChange={next => column.setFilterValue(next || undefined)}
                options={[{ value: '', label: 'All' }, ...(meta.options ?? []).map(option => ({ value: option, label: option }))]}
                className="rounded! bg-canvas!"
            />
        );
    }

    return (
        <input
            type="text"
            aria-label={label}
            title={meta.filter === 'number' ? 'A number, a comparison like >10, or a range like 5-10' : undefined}
            placeholder={meta.filter === 'number' ? 'e.g. >10' : ''}
            value={value}
            onChange={event => column.setFilterValue(event.target.value)}
            className={classes}
        />
    );
}
