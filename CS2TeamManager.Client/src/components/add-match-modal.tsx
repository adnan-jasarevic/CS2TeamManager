import { useState } from 'react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { MAP_POOL } from '../constants/maps';
import { MatchKind, MatchStatus, type CreateMatchRequest, type MatchKindValue, type MatchMap, type MatchStatusValue } from '../types';

interface AddMatchModalProps {
    teamId: number;
    onClose: () => void;
    onCreated: () => void;
}

const BEST_OF_OPTIONS = [1, 2, 3, 5];

// Score inputs are kept as text so a field can be left empty (map not played, halves not tracked).
type ScoreField = 'ourScore' | 'opponentScore' | 'ourFirstHalf' | 'opponentFirstHalf' | 'ourSecondHalf' | 'opponentSecondHalf';
type MapScoreInput = Record<ScoreField, string>;

const EMPTY_MAP_SCORE: MapScoreInput = {
    ourScore: '',
    opponentScore: '',
    ourFirstHalf: '',
    opponentFirstHalf: '',
    ourSecondHalf: '',
    opponentSecondHalf: '',
};

const toNumber = (value: string) => (value.trim() === '' ? undefined : Math.max(0, Number(value)));

const inputClass = 'w-full px-4 py-2 bg-[#111322] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff6b4a]';
const labelClass = 'block text-gray-400 text-sm mb-1';

export default function AddMatchModal({ teamId, onClose, onCreated }: AddMatchModalProps) {
    const [opponentName, setOpponentName] = useState('');
    const [tournament, setTournament] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [status, setStatus] = useState<MatchStatusValue>(MatchStatus.Scheduled);
    const [type, setType] = useState<MatchKindValue>(MatchKind.Official);
    const [ourScore, setOurScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [bestOf, setBestOf] = useState(1);
    const [maps, setMaps] = useState<string[]>([]);
    const [mapScores, setMapScores] = useState<Record<string, MapScoreInput>>({});
    const [notes, setNotes] = useState('');

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isFinished = status === MatchStatus.Finished;
    const hasMapScores = isFinished && maps.length > 0;

    const scoreFor = (map: string) => mapScores[map] ?? EMPTY_MAP_SCORE;

    const setMapScore = (map: string, field: ScoreField, value: string) => {
        setMapScores(current => ({ ...current, [map]: { ...(current[map] ?? EMPTY_MAP_SCORE), [field]: value } }));
    };

    const buildMap = (map: string): MatchMap => {
        const score = scoreFor(map);
        if (!isFinished) return { mapName: map };
        return {
            mapName: map,
            ourScore: toNumber(score.ourScore),
            opponentScore: toNumber(score.opponentScore),
            ourFirstHalf: toNumber(score.ourFirstHalf),
            opponentFirstHalf: toNumber(score.opponentFirstHalf),
            ourSecondHalf: toNumber(score.ourSecondHalf),
            opponentSecondHalf: toNumber(score.opponentSecondHalf),
        };
    };

    // Mirrors the API: a Bo1 shows the round score, a longer series shows maps won.
    const playedMaps = maps.map(buildMap).filter(m => m.ourScore != null && m.opponentScore != null);
    const seriesPreview = playedMaps.length === 0
        ? null
        : bestOf === 1 && playedMaps.length === 1
            ? `${playedMaps[0].ourScore} - ${playedMaps[0].opponentScore}`
            : `${playedMaps.filter(m => m.ourScore! > m.opponentScore!).length} - ${playedMaps.filter(m => m.opponentScore! > m.ourScore!).length}`;

    const toggleMap = (map: string) => {
        setMaps(current => {
            if (current.includes(map)) return current.filter(m => m !== map);
            if (current.length >= bestOf) return current;
            return [...current, map];
        });
    };

    const handleBestOfChange = (value: number) => {
        setBestOf(value);
        setMaps(current => current.slice(0, value));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!opponentName.trim() || !scheduledDate) {
            setError('Opponent and date are required.');
            return;
        }

        // datetime-local has no time zone; new Date() reads it as the user's local time and toISOString() sends UTC.
        const scheduledIso = new Date(scheduledDate).toISOString();

        const payload: CreateMatchRequest = {
            opponentName: opponentName.trim(),
            tournament: tournament.trim() || undefined,
            scheduledDate: scheduledIso,
            playedDate: isFinished ? scheduledIso : undefined,
            status,
            type,
            ourScore: isFinished ? ourScore : 0,
            opponentScore: isFinished ? opponentScore : 0,
            bestOf,
            maps: maps.map(buildMap),
            notes: notes.trim() || undefined,
        };

        setIsSubmitting(true);
        try {
            await api.post(`/Matches/${teamId}`, payload);
            onCreated();
            onClose();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to add the match.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Add Match</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded text-sm">{error}</div>}

                    <div>
                        <label className={labelClass}>Type</label>
                        <div className="flex gap-2">
                            {([['Official', MatchKind.Official], ['Scrim', MatchKind.Scrim]] as const).map(([label, value]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setType(value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${type === value
                                        ? 'bg-[#ff6b4a] border-[#ff6b4a] text-white'
                                        : 'bg-[#111322] border-gray-700 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Opponent</label>
                        <input
                            type="text"
                            value={opponentName}
                            onChange={(e) => setOpponentName(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Team Liquid"
                            maxLength={100}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Tournament (optional)</label>
                        <input
                            type="text"
                            value={tournament}
                            onChange={(e) => setTournament(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Local LAN Cup"
                            maxLength={100}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Date and time</label>
                            <input
                                type="datetime-local"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(Number(e.target.value) as MatchStatusValue)}
                                className={inputClass}
                            >
                                <option value={MatchStatus.Scheduled}>Scheduled</option>
                                <option value={MatchStatus.Finished}>Finished</option>
                                <option value={MatchStatus.Cancelled}>Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {isFinished && !hasMapScores && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Our score</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={ourScore}
                                    onChange={(e) => setOurScore(Math.max(0, Number(e.target.value)))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Opponent score</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={opponentScore}
                                    onChange={(e) => setOpponentScore(Math.max(0, Number(e.target.value)))}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Format</label>
                        <div className="flex gap-2">
                            {BEST_OF_OPTIONS.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleBestOfChange(option)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${bestOf === option
                                        ? 'bg-[#ff6b4a] border-[#ff6b4a] text-white'
                                        : 'bg-[#111322] border-gray-700 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Bo{option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Maps ({maps.length}/{bestOf}, in play order)</label>
                        <div className="flex flex-wrap gap-2">
                            {MAP_POOL.map(map => {
                                const index = maps.indexOf(map);
                                const selected = index !== -1;
                                const disabled = !selected && maps.length >= bestOf;
                                return (
                                    <button
                                        key={map}
                                        type="button"
                                        onClick={() => toggleMap(map)}
                                        disabled={disabled}
                                        className={`px-3 py-1 rounded text-sm border transition-colors disabled:opacity-40 ${selected
                                            ? 'bg-[#ff6b4a]/20 border-[#ff6b4a] text-[#ff6b4a]'
                                            : 'bg-[#111322] border-gray-700 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {selected && `${index + 1}. `}{map}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {hasMapScores && (
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-400 text-sm">Map scores (leave a map empty if it wasn't played)</span>
                                {seriesPreview && <span className="text-white font-bold">{seriesPreview}</span>}
                            </div>
                            {maps.map((map, index) => {
                                const score = scoreFor(map);
                                const scoreInput = (field: ScoreField, label: string) => (
                                    <input
                                        type="number"
                                        min={0}
                                        value={score[field]}
                                        onChange={(e) => setMapScore(map, field, e.target.value)}
                                        className={`${inputClass} text-center px-2`}
                                        placeholder="-"
                                        aria-label={`${map} ${label}`}
                                    />
                                );
                                return (
                                    <div key={map} className="bg-[#111322] border border-gray-700 rounded-lg p-3">
                                        <p className="text-white font-bold text-sm mb-2">{index + 1}. {map}</p>
                                        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center text-xs text-gray-500">
                                            <span />
                                            <span className="text-center">Final</span>
                                            <span className="text-center">1st half</span>
                                            <span className="text-center">2nd half</span>
                                            <span>Us</span>
                                            {scoreInput('ourScore', 'our final score')}
                                            {scoreInput('ourFirstHalf', 'our first half')}
                                            {scoreInput('ourSecondHalf', 'our second half')}
                                            <span>Them</span>
                                            {scoreInput('opponentScore', 'opponent final score')}
                                            {scoreInput('opponentFirstHalf', 'opponent first half')}
                                            {scoreInput('opponentSecondHalf', 'opponent second half')}
                                        </div>
                                    </div>
                                );
                            })}
                            <p className="text-xs text-gray-500">Halves are optional. If the final score is higher than both halves added up, the map went to overtime.</p>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`${inputClass} resize-none`}
                            rows={3}
                            maxLength={1000}
                        />
                    </div>

                    <div className="mt-2 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !opponentName.trim() || !scheduledDate}
                            className="bg-[#ff6b4a] hover:bg-[#e5593c] px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Add Match'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
