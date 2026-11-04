import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import AddMatchModal from '../components/add-match-modal';
import { type Match, type Team } from '../types';

type Filter = 'all' | 'upcoming' | 'results';

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'results', label: 'Results' },
];

const outcomeClass = (outcome: string) => {
    if (outcome === 'Win') return 'bg-emerald-500/20 text-emerald-400';
    if (outcome === 'Loss') return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
};

const statusClass = (status: string) => {
    if (status === 'Live') return 'bg-[#ff6b4a]/20 text-[#ff6b4a]';
    if (status === 'Cancelled') return 'bg-gray-500/20 text-gray-500 line-through';
    return 'bg-blue-500/20 text-blue-400';
};

const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function Matches() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [filter, setFilter] = useState<Filter>('all');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await api.get<Team[]>('/Teams/my-teams');
                setTeams(response.data);
                if (response.data.length > 0) setSelectedTeamId(response.data[0].id);
            } catch (err: unknown) {
                setError(getApiErrorMessage(err, 'Failed to load teams.'));
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

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

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const canManageMatches = selectedTeam?.currentUserRole === 'Owner' || selectedTeam?.currentUserRole === 'Captain';

    // The API returns matches newest first.
    const visibleMatches = matches.filter(m => {
        if (filter === 'upcoming') return m.status === 'Scheduled' || m.status === 'Live';
        if (filter === 'results') return m.status === 'Finished';
        return true;
    });

    if (loading) return <div className="text-gray-400 p-8">Loading matches...</div>;

    if (teams.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold text-white mb-2">Matches</h1>
                <p className="text-gray-400">You need to create or join a team first.</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Matches</h1>
                    <p className="text-gray-400">Every match your team has scheduled or played.</p>
                </div>

                <div className="flex items-end gap-4">
                    {canManageMatches && (
                        <button
                            onClick={() => setIsAddMatchOpen(true)}
                            className="bg-[#ff6b4a] hover:bg-[#e5593c] px-4 py-2 rounded-lg font-bold text-white transition-colors shadow-lg"
                        >
                            + Add Match
                        </button>
                    )}

                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Select Team:</label>
                        <select
                            className="bg-[#181a2d] border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#ff6b4a]"
                            value={selectedTeamId || ''}
                            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                        >
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.currentUserRole})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">{error}</div>}

            <div className="flex gap-2 mb-6">
                {FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${filter === f.value
                            ? 'bg-[#ff6b4a] border-[#ff6b4a] text-white'
                            : 'bg-[#181a2d] border-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="bg-[#181a2d] rounded-xl border border-gray-800 shadow-md overflow-hidden">
                {visibleMatches.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No matches here yet.</p>
                ) : (
                    visibleMatches.map(match => (
                        <div key={match.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-gray-800 last:border-b-0">
                            <div className="flex items-center gap-4">
                                {match.status === 'Finished' ? (
                                    <span className={`px-3 py-1 rounded text-xs font-bold w-24 text-center uppercase ${outcomeClass(match.matchOutcome)}`}>
                                        {match.matchOutcome}
                                    </span>
                                ) : (
                                    <span className={`px-3 py-1 rounded text-xs font-bold w-24 text-center uppercase ${statusClass(match.status)}`}>
                                        {match.status}
                                    </span>
                                )}
                                <div>
                                    <p className="font-bold text-white">vs {match.opponentName}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatDateTime(match.scheduledDate)}
                                        {match.tournament && ` · ${match.tournament}`}
                                        {match.bestOf && ` · Bo${match.bestOf}`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 md:justify-end">
                                {match.maps.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {match.maps.map((map, i) => (
                                            <span key={`${map}-${i}`} className="px-2 py-0.5 rounded bg-[#111322] border border-gray-800 text-xs text-gray-400">
                                                {map}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {match.status === 'Finished' && (
                                    <span className="font-bold text-white text-lg w-16 text-right">{match.finalScore}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isAddMatchOpen && selectedTeamId !== null && (
                <AddMatchModal
                    teamId={selectedTeamId}
                    onClose={() => setIsAddMatchOpen(false)}
                    onCreated={() => fetchMatches(selectedTeamId)}
                />
            )}
        </div>
    );
}
