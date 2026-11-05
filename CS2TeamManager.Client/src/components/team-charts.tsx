import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { Crosshair, Map as MapIcon, Percent, Swords, TrendingUp } from 'lucide-react';
import { formatShortDate } from '../lib/format';
import { type FormPoint, type MapStats, type TeamStats } from '../types';
import { Card, CardHeader, EmptyState, StatGrid, StatTile } from './ui';

// One series per chart, so one colour. It's ink rather than red, because red already means "loss"
// in this app and win rate bars shouldn't read as bad news. Red marks only the 50% break-even line.
const SERIES = 'var(--rs-chart-series)';
const SURFACE = 'var(--rs-surface)';
const GRID = 'var(--rs-chart-grid)';
const AXIS_TEXT = 'var(--rs-fg-muted)';
const BREAK_EVEN = 'var(--rs-accent-text)';

const tickStyle = { fill: AXIS_TEXT, fontSize: 12 };

const tooltipBox = 'rounded-md border border-line bg-raised px-3 py-2 text-xs shadow-overlay';

function MapTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null;
    const map = payload[0].payload as MapStats;
    const diff = map.roundsWon - map.roundsLost;
    return (
        <div className={tooltipBox}>
            <p className="mb-1 font-bold text-fg">{map.mapName}</p>
            <p className="text-fg-muted">Win rate: <span className="font-semibold text-fg">{map.winRatePercentage}%</span></p>
            <p className="text-fg-muted">{map.wins}W {map.losses}L{map.draws > 0 ? ` ${map.draws}D` : ''} · {map.played} played</p>
            <p className="text-fg-muted">Rounds {map.roundsWon}:{map.roundsLost} ({diff > 0 ? '+' : ''}{diff})</p>
        </div>
    );
}

function FormTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as FormPoint;
    return (
        <div className={tooltipBox}>
            <p className="mb-1 font-bold text-fg">vs {point.opponentName}</p>
            <p className="text-fg-muted">{formatShortDate(point.date)} · {point.matchOutcome}</p>
            <p className="text-fg-muted">Win rate so far: <span className="font-semibold text-fg">{point.winRatePercentage}%</span></p>
        </div>
    );
}

export default function TeamCharts({ stats }: { stats: TeamStats }) {
    const wins = stats.form.filter(f => f.matchOutcome === 'Win').length;
    const draws = stats.form.filter(f => f.matchOutcome === 'Draw').length;
    const losses = stats.form.filter(f => f.matchOutcome === 'Loss').length;
    const latest = stats.form[stats.form.length - 1];

    // Bars sorted by win rate so the strongest map reads first.
    const mapData = [...stats.maps].sort((a, b) => b.winRatePercentage - a.winRatePercentage || b.played - a.played);
    const best = mapData[0];
    const barHeight = Math.max(160, mapData.length * 40 + 40);

    return (
        <div className="flex flex-col gap-6">
            <StatGrid>
                <StatTile label="Matches played" value={stats.matchesPlayed} icon={<Swords />} />
                <StatTile label="Win rate" value={latest ? `${latest.winRatePercentage}%` : '-'} icon={<Percent />} />
                <StatTile label="Record" value={`${wins}W ${losses}L${draws > 0 ? ` ${draws}D` : ''}`} icon={<TrendingUp />} />
                <StatTile label="Best map" value={best?.mapName ?? '-'} hint={best && `${best.winRatePercentage}%`} icon={<MapIcon />} />
            </StatGrid>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader title="Win rate by map" description="Share of played maps won, with maps played in brackets. The red line marks 50%." />
                    <div className="px-3 pb-5 sm:px-5">
                        {mapData.length === 0 ? (
                            <EmptyState compact icon={<Crosshair />} title="No map scores yet" description="Add map scores to finished matches to see this chart." />
                        ) : (
                            <figure aria-label={`Win rate by map. Best: ${best.mapName} at ${best.winRatePercentage}%. Every value is in the list that follows.`}>
                                <ResponsiveContainer width="100%" height={barHeight}>
                                    <BarChart data={mapData} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 8 }} barCategoryGap={8}>
                                        <CartesianGrid horizontal={false} stroke={GRID} />
                                        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} stroke={GRID} tick={tickStyle} />
                                        <YAxis type="category" dataKey="mapName" width={116} tickFormatter={(name: string) => `${name} (${mapData.find(m => m.mapName === name)?.played ?? 0})`} stroke={GRID} tick={tickStyle} tickLine={false} />
                                        <Tooltip content={MapTooltip} cursor={{ fill: 'var(--rs-hover)' }} />
                                        <Bar dataKey="winRatePercentage" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={24} minPointSize={3} isAnimationActive={false}>
                                            <LabelList
                                                dataKey="winRatePercentage"
                                                content={(props) => {
                                                    // Drawn by hand so a 0% bar still gets its label.
                                                    const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
                                                    const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
                                                    return (
                                                        <text x={x} y={y} dy={4} fill="var(--rs-fg)" fontSize={12}>
                                                            {`${props.value}%`}
                                                        </text>
                                                    );
                                                }}
                                            />
                                        </Bar>
                                        <ReferenceLine x={50} stroke={BREAK_EVEN} strokeWidth={1.5} strokeDasharray="4 4" />
                                    </BarChart>
                                </ResponsiveContainer>
                                <figcaption className="sr-only">
                                    <ul>
                                        {mapData.map(map => (
                                            <li key={map.mapName}>{map.mapName}: {map.winRatePercentage}% from {map.played} played.</li>
                                        ))}
                                    </ul>
                                </figcaption>
                            </figure>
                        )}
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Win rate over time" description="Running win rate after each finished match. The red line marks 50%." />
                    <div className="px-3 pb-5 sm:px-5">
                        {stats.form.length === 0 ? (
                            <EmptyState compact icon={<TrendingUp />} title="No finished matches yet" description="Your win rate trend starts with your first result." />
                        ) : (
                            <figure aria-label={`Win rate over time, now at ${latest.winRatePercentage}% after ${stats.form.length} matches. Every match is in the table below.`}>
                                <ResponsiveContainer width="100%" height={Math.max(barHeight, 240)}>
                                    <LineChart data={stats.form} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                        <CartesianGrid vertical={false} stroke={GRID} />
                                        <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={GRID} tick={tickStyle} minTickGap={24} />
                                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} width={44} stroke={GRID} tick={tickStyle} />
                                        <Tooltip content={FormTooltip} cursor={{ stroke: 'var(--rs-line-strong)', strokeWidth: 1 }} />
                                        <ReferenceLine y={50} stroke={BREAK_EVEN} strokeWidth={1.5} strokeDasharray="4 4" />
                                        <Line
                                            type="linear"
                                            dataKey="winRatePercentage"
                                            stroke={SERIES}
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
                                            isAnimationActive={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </figure>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
