import { useOutletContext } from 'react-router-dom';

export interface LayoutContext {
    // Bumped whenever the user's team list changes outside the current page,
    // e.g. after accepting a team invite. Pages refetch their teams when it changes.
    teamsVersion: number;
}

export function useLayoutContext() {
    return useOutletContext<LayoutContext>();
}
