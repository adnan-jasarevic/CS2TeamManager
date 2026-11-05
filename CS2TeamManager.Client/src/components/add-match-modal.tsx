import { useState } from 'react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { MAP_POOL } from '../constants/maps';
import { MatchKind, MatchStatus, type CreateMatchRequest, type MatchKindValue, type MatchMap, type MatchStatusValue } from '../types';
import { Alert, Button, Field, Input, Modal, SegmentedControl, Select, Textarea, ToggleChip } from './ui';

interface AddMatchModalProps {
    teamId: number;
    onClose: () => void;
    onCreated: () => void;
}

const TYPE_OPTIONS = [
    { value: MatchKind.Official, label: 'Official' },
    { value: MatchKind.Scrim, label: 'Scrim' },
];

const BEST_OF_OPTIONS = [1, 2, 3, 5].map(value => ({ value, label: `Bo${value}` }));

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
    const [showFieldErrors, setShowFieldErrors] = useState(false);
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

        // The button stays enabled so pressing it can explain what's missing, right on the fields.
        if (!opponentName.trim() || !scheduledDate) {
            setShowFieldErrors(true);
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
        <Modal
            open
            onClose={onClose}
            title="Add match"
            busy={isSubmitting}
            closeOnBackdrop={false}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" form="add-match-form" loading={isSubmitting} loadingText="Saving...">Add match</Button>
                </>
            }
        >
            <form id="add-match-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {error && <Alert tone="danger">{error}</Alert>}

                <SegmentedControl label="Type" value={type} options={TYPE_OPTIONS} onChange={setType} />

                <Field label="Opponent" required error={showFieldErrors && !opponentName.trim() ? 'Enter the opponent\'s name.' : undefined}>
                    <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="e.g. Tokyo Ronin" maxLength={100} autoComplete="off" data-autofocus />
                </Field>

                <Field label="Tournament" optional>
                    <Input value={tournament} onChange={(e) => setTournament(e.target.value)} placeholder="e.g. Local LAN Cup" maxLength={100} autoComplete="off" />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Date and time" required error={showFieldErrors && !scheduledDate ? 'Pick a date and time.' : undefined}>
                        <Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                    </Field>
                    <Field label="Status">
                        <Select value={status} onChange={(e) => setStatus(Number(e.target.value) as MatchStatusValue)}>
                            <option value={MatchStatus.Scheduled}>Scheduled</option>
                            <option value={MatchStatus.Finished}>Finished</option>
                            <option value={MatchStatus.Cancelled}>Cancelled</option>
                        </Select>
                    </Field>
                </div>

                {isFinished && !hasMapScores && (
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Our score">
                            <Input type="number" inputMode="numeric" min={0} value={ourScore} onChange={(e) => setOurScore(Math.max(0, Number(e.target.value)))} />
                        </Field>
                        <Field label="Opponent score">
                            <Input type="number" inputMode="numeric" min={0} value={opponentScore} onChange={(e) => setOpponentScore(Math.max(0, Number(e.target.value)))} />
                        </Field>
                    </div>
                )}

                <SegmentedControl label="Format" value={bestOf} options={BEST_OF_OPTIONS} onChange={handleBestOfChange} />

                <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-fg-muted">
                        Maps <span className="font-normal text-fg-subtle tabular-nums">({maps.length}/{bestOf}, in play order)</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {MAP_POOL.map(map => {
                            const index = maps.indexOf(map);
                            const selected = index !== -1;
                            return (
                                <ToggleChip key={map} pressed={selected} disabled={!selected && maps.length >= bestOf} onToggle={() => toggleMap(map)}>
                                    {selected && <span className="mr-1 font-bold text-accent-text">{index + 1}.</span>}{map}
                                </ToggleChip>
                            );
                        })}
                    </div>
                </fieldset>

                {hasMapScores && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-sm font-medium text-fg-muted">Map scores <span className="font-normal text-fg-subtle">(leave a map empty if it wasn't played)</span></span>
                            {seriesPreview && <span className="shrink-0 font-display font-black text-fg tabular-nums">{seriesPreview}</span>}
                        </div>
                        {maps.map((map, index) => {
                            const score = scoreFor(map);
                            const scoreInput = (field: ScoreField, label: string) => (
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={score[field]}
                                    onChange={(e) => setMapScore(map, field, e.target.value)}
                                    className="px-1 text-center"
                                    placeholder="-"
                                    aria-label={`${map} ${label}`}
                                />
                            );
                            return (
                                <fieldset key={map} className="rounded-md border border-line bg-sunken p-3">
                                    <legend className="px-1 text-sm font-bold text-fg">{index + 1}. {map}</legend>
                                    <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2 text-xs text-fg-subtle">
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
                                </fieldset>
                            );
                        })}
                        <p className="text-xs text-fg-subtle">Halves are optional. If the final score is higher than both halves added up, the map went to overtime.</p>
                    </div>
                )}

                <Field label="Notes" optional>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                </Field>
            </form>
        </Modal>
    );
}
