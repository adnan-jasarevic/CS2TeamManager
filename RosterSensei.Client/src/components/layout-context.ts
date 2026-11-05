import { useOutletContext } from 'react-router-dom';
import { type Team } from '../types';

export interface LayoutContext {
    teams: Team[];
    /** The team every page is showing. Null until teams load, or if the user has none. */
    selectedTeam: Team | null;
    teamsLoading: boolean;
    teamsError: string | undefined;
    selectTeam: (teamId: number) => void;
    /** Refetch after anything that changes the list or a role: a new team, an invite, a transfer. */
    reloadTeams: () => void;
}

export function useLayoutContext() {
    return useOutletContext<LayoutContext>();
}
