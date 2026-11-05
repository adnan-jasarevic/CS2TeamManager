import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, ChartNoAxesCombined, LayoutDashboard, LogOut, Swords, Users, type LucideIcon } from 'lucide-react';
import api from '../services/api';
import { useResource } from '../hooks/use-resource';
import { cx } from '../lib/cx';
import { type Team } from '../types';
import { Logo } from './brand/logo';
import { type LayoutContext } from './layout-context';
import TopNavigation from './top-navigation';
import { PageSkeleton } from './page-skeletons';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/team', label: 'Team', icon: Users },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/matches', label: 'Matches', icon: Swords },
    { to: '/statistics', label: 'Statistics', icon: ChartNoAxesCombined },
];

const SELECTED_TEAM_KEY = 'rs-selected-team';

const loadTeams = (signal: AbortSignal) => api.get<Team[]>('/Teams/my-teams', { signal }).then(response => response.data);

const readSelectedTeam = () => {
    try {
        const stored = Number(localStorage.getItem(SELECTED_TEAM_KEY));
        return Number.isInteger(stored) && stored > 0 ? stored : null;
    } catch {
        return null;
    }
};

export default function AppLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const mainRef = useRef<HTMLElement>(null);
    const previousPath = useRef(pathname);

    const { data: teams, isLoading: teamsLoading, error: teamsError, reload: reloadTeams } = useResource(loadTeams, 'Failed to load your teams.');
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(readSelectedTeam);

    const selectTeam = useCallback((teamId: number) => {
        setSelectedTeamId(teamId);
        try {
            localStorage.setItem(SELECTED_TEAM_KEY, String(teamId));
        } catch {
            // The choice just won't survive a reload.
        }
    }, []);

    // Falls back to the first team if the remembered one is gone, e.g. the user was removed from it.
    const selectedTeam = teams?.find(team => team.id === selectedTeamId) ?? teams?.[0] ?? null;

    const outletContext = useMemo<LayoutContext>(() => ({
        teams: teams ?? [],
        selectedTeam,
        teamsLoading,
        teamsError,
        selectTeam,
        reloadTeams,
    }), [teams, selectedTeam, teamsLoading, teamsError, selectTeam, reloadTeams]);

    // Client-side navigation doesn't move focus or scroll by itself the way a page load does.
    useEffect(() => {
        if (previousPath.current === pathname) return;
        previousPath.current = pathname;
        mainRef.current?.scrollTo(0, 0);
        mainRef.current?.focus({ preventScroll: true });
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        navigate('/login');
    };

    const currentPage = NAV_ITEMS.find(item => pathname.startsWith(item.to))?.label;

    return (
        <div className="flex h-dvh overflow-hidden bg-canvas text-fg">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-on-accent">
                Skip to content
            </a>

            <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
                <div className="px-5 py-5">
                    <Logo />
                </div>
                <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-2">
                    {NAV_ITEMS.map(item => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors', isActive ? 'text-on-accent' : 'text-fg-muted hover:bg-hover hover:text-fg')}>
                            {({ isActive }) => (
                                <>
                                    {isActive && <motion.span layoutId="nav-side-active" className="absolute inset-0 rounded-md bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                                    <item.icon className="relative size-5" aria-hidden="true" />
                                    <span className="relative">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className="border-t border-line p-3">
                    <button type="button" onClick={handleLogout} className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg">
                        <LogOut className="size-5" aria-hidden="true" /> Log out
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <TopNavigation
                    teams={teams ?? []}
                    selectedTeam={selectedTeam}
                    onSelectTeam={selectTeam}
                    onInviteAccepted={reloadTeams}
                    onLogout={handleLogout}
                />

                <main id="main" ref={mainRef} tabIndex={-1} data-scroll-root className="min-h-0 flex-1 overflow-y-auto">
                    <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
                        <Suspense fallback={<PageSkeleton label={`Loading ${currentPage?.toLowerCase() ?? 'page'}`} />}>
                            <Outlet context={outletContext} />
                        </Suspense>
                    </motion.div>
                </main>

                {/* Bottom tabs on phones and tablets: every destination in reach of a thumb. */}
                <nav aria-label="Main" className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
                    {NAV_ITEMS.map(item => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold', isActive ? 'text-fg' : 'text-fg-muted')}>
                            {({ isActive }) => (
                                <>
                                    {isActive && <motion.span layoutId="nav-bottom-active" className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                                    <item.icon className={cx('size-5', isActive && 'text-accent-text')} aria-hidden="true" />
                                    <span className="max-w-full truncate px-1">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Tells screen reader users the page changed, as a full page load would. */}
            <div role="status" className="sr-only">{currentPage}</div>
        </div>
    );
}
