import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AppLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#111322] text-white font-sans">

            {/* SIDEBAR */}
            <aside className="w-64 bg-[#181a2d] border-r border-gray-800 flex flex-col justify-between">
                <div>
                    <div className="p-6 mb-4">
                        <h1 className="text-2xl font-bold text-[#ff6b4a]">
                            CS2 Team<br/>Manager
                        </h1>
                    </div>

                    <nav className="flex flex-col gap-2 px-4">
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[#ff6b4a] text-white font-medium shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`
                            }
                        >
                            <span>⌘</span> Dashboard
                        </NavLink>

                        <NavLink
                            to="/team"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[#ff6b4a] text-white font-medium shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`
                            }
                        >
                            <span>👥</span> Team
                        </NavLink>

                        <NavLink
                            to="/calendar"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[#ff6b4a] text-white font-medium shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`
                            }
                        >
                            <span>📅</span> Calendar
                        </NavLink>

                        <NavLink
                            to="/matches"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[#ff6b4a] text-white font-medium shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`
                            }
                        >
                            <span>🎯</span> Matches
                        </NavLink>

                        <NavLink
                            to="/statistics"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[#ff6b4a] text-white font-medium shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`
                            }
                        >
                            <span>📈</span> Statistics
                        </NavLink>
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto bg-[#0a0c16]">
                <Outlet />
            </main>

        </div>
    );
}
