import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import TopNavigation from './top-navigation';
import { type LayoutContext } from './layout-context';

export default function AppLayout() {
    const navigate = useNavigate();
    const [teamsVersion, setTeamsVersion] = useState(0);
    // Below the md breakpoint the sidebar is a drawer opened from the top bar.
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const closeMenu = () => setIsMenuOpen(false);

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#111322] text-white font-sans overflow-hidden">
            {isMenuOpen && (
                <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={closeMenu} aria-hidden="true" />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#181a2d] border-r border-gray-800 flex flex-col justify-between transition-transform md:static md:z-20 md:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div>
                    <div className="p-6 mb-4">
                        <h1 className="text-2xl font-bold text-[#ff6b4a]">
                            CS2 Team<br />Manager
                        </h1>
                    </div>
                    <nav className="flex flex-col gap-2 px-4">
                        <NavLink onClick={closeMenu} to="/dashboard" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-[#ff6b4a] text-white font-medium shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                            <span>⌘</span> Dashboard
                        </NavLink>
                        <NavLink onClick={closeMenu} to="/team" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-[#ff6b4a] text-white font-medium shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                            <span>👥</span> Team
                        </NavLink>
                        <NavLink onClick={closeMenu} to="/calendar" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-[#ff6b4a] text-white font-medium shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                            <span>📅</span> Calendar
                        </NavLink>
                        <NavLink onClick={closeMenu} to="/matches" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-[#ff6b4a] text-white font-medium shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                            <span>🎯</span> Matches
                        </NavLink>
                        <NavLink onClick={closeMenu} to="/statistics" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-[#ff6b4a] text-white font-medium shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                            <span>📈</span> Statistics
                        </NavLink>
                    </nav>
                </div>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 flex flex-col bg-[#0a0c16] relative overflow-hidden">
                <TopNavigation
                    onInviteAccepted={() => setTeamsVersion(v => v + 1)}
                    onOpenMenu={() => setIsMenuOpen(true)}
                />

                <div className="flex-1 overflow-y-auto">
                    <Outlet context={{ teamsVersion } satisfies LayoutContext} />
                </div>
            </main>
        </div>
    );
}