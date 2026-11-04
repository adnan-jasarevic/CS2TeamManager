import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { type FormPoint, type MapStats, type TeamStats } from '../types';

// One series per chart, so one hue. Grid and axes stay recessive.
const SERIES = '#3987e5';
const GRID = '#1f2937';
const AXIS_TEXT = '#9ca3af';

const tooltipBox = 'bg-[#111322] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl';

const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function MapTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null;
    const map = payload[0].payload as MapStats;
    const diff = map.roundsWon - map.roundsLost;
    return (
        <div className={tooltipBox}>
            <p className="text-white font-bold mb-1">{map.mapName}</p>
            <p className="text-gray-300">Win rate: <span className="text-white font-semibold">{map.winRatePercentage}%</span></p>
            <p className="text-gray-400">{map.wins}W {map.losses}L{map.draws > 0 ? ` ${map.draws}D` : ''} · {map.played} played</p>
            <p className="text-gray-400">Rounds {map.roundsWon}:{map.roundsLost} ({diff > 0 ? '+' : ''}{diff})</p>
        </div>
    );
}

function FormTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as FormPoint;
    return (
        <div className={tooltipBox}>
            <p className="text-white font-bold mb-1">vs {point.opponentName}</p>
            <p className="text-gray-400">{formatShortDate(point.date)} · {point.matchOutcome}</p>
            <p className="text-gray-300">Win rate so far: <span className="text-white font-semibold">{point.winRatePercentage}%</span></p>
        </div>
    );
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#181a2d] rounded-xl border border-gray-800 p-5">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}

export default function TeamCharts({ stats }: { stats: TeamStats }) {
    const wins = stats.form.filter(f => f.matchOutcome === 'Win').length;
    const overall = stats.form.length ? `${stats.form[stats.form.length - 1].winRatePercentage}%` : '-';
    const best = stats.maps.length
        ? [...stats.maps].sort((a, b) => b.winRatePercentage - a.winRatePercentage || b.played - a.played)[0]
        : null;

    // Bars sorted by win rate so the strongest map reads first.
    const mapData = [...stats.maps].sort((a, b) => b.winRatePercentage - a.winRatePercentage || b.played - a.played);
    const barHeight = Math.max(160, mapData.length * 40 + 40);

    return (
        <div className="flex flex-col gap-6 mb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Matches played" value={String(stats.matchesPlayed)} />
                <StatTile label="Win rate" value={overall} />
                <StatTile label="Record" value={`${wins}W ${stats.matchesPlayed - wins}L`} />
                <StatTile label="Best map" value={best ? `${best.mapName} ${best.winRatePercentage}%` : '-'} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-[#181a2d] rounded-xl border border-gray-800 p-5">
                    <h3 className="text-white font-bold mb-1">Win rate by map</h3>
                    <p className="text-xs text-gray-500 mb-4">Share of played maps won, with maps played in brackets. Hover a bar for the record and rounds.</p>
                    {mapData.length === 0 ? (
                        <p className="text-gray-500 text-sm py-10 text-center">No map scores recorded yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={barHeight}>
                            <BarChart data={mapData} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 8 }} barCategoryGap={8}>
                                <CartesianGrid horizontal={false} stroke={GRID} />
                                <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} stroke={GRID} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                                <YAxis type="category" dataKey="mapName" width={96} tickFormatter={(name: string) => `${name} (${mapData.find(m => m.mapName === name)?.played ?? 0})`} stroke={GRID} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} />
                                <Tooltip content={MapTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="winRatePercentage" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={24} minPointSize={3} isAnimationActive={false}>
                                    <LabelList
                                        dataKey="winRatePercentage"
                                        content={(props) => {
                                            // Drawn by hand so a 0% bar still gets its label.
                                            const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
                                            const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
                                            return (
                                                <text x={x} y={y} dy={4} fill="#e5e7eb" fontSize={12}>
                                                    {`${props.value}%`}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-[#181a2d] rounded-xl border border-gray-800 p-5">
                    <h3 className="text-white font-bold mb-1">Win rate over time</h3>
                    <p className="text-xs text-gray-500 mb-4">Running win rate after each finished match.</p>
                    {stats.form.length === 0 ? (
                        <p className="text-gray-500 text-sm py-10 text-center">No finished matches yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(barHeight, 240)}>
                            <LineChart data={stats.form} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                <CartesianGrid vertical={false} stroke={GRID} />
                                <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={GRID} tick={{ fill: AXIS_TEXT, fontSize: 12 }} minTickGap={24} />
                                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} width={44} stroke={GRID} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                                <Tooltip content={FormTooltip} cursor={{ stroke: '#4b5563', strokeWidth: 1 }} />
                                <Line
                                    type="linear"
                                    dataKey="winRatePercentage"
                                    stroke={SERIES}
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: SERIES, stroke: '#181a2d', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: SERIES, stroke: '#181a2d', strokeWidth: 2 }}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
