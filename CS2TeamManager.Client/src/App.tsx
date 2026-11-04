import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import TeamRoster from './pages/teamroster';
import Matches from './pages/matches';
import PrivateRoute from './components/private-route';
import AppLayout from './components/app-layout';

// AG Grid and react-big-calendar are large, so these pages are only loaded when opened.
const Statistics = lazy(() => import('./pages/statistics'));
const CalendarPage = lazy(() => import('./pages/calendar'));

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* public routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* private routes */}
                <Route
                    element={
                        <PrivateRoute>
                            <AppLayout />
                        </PrivateRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/team" element={<TeamRoster />} />
                    <Route path="/matches" element={<Matches />} />
                    <Route
                        path="/calendar"
                        element={<Suspense fallback={<div className="text-gray-400 p-8">Loading calendar...</div>}><CalendarPage /></Suspense>}
                    />
                    <Route
                        path="/statistics"
                        element={<Suspense fallback={<div className="text-gray-400 p-8">Loading analytics...</div>}><Statistics /></Suspense>}
                    />

                    {/* fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;