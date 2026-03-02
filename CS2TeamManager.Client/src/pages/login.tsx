import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import api from '../services/api';
import { type UserUser } from '../types';

export default function Login() {
    // Initialize useNavigate for redirecting after login
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post<UserUser>('/Auth/login', {
                email,
                password
            });

            // Save the JWT token to local storage
            localStorage.setItem('jwt_token', response.data.token);

            console.log('Successful login! Welcome:', response.data.username);

            // Redirect the user to the dashboard immediately
            navigate('/dashboard');

        } catch (err) {
            console.error('Error while trying to log in:', err);
            setError('Wrong email or password. Try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">

                <h2 className="text-3xl font-bold text-white text-center mb-6">
                    CS2 Team Manager
                </h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mt-6"
                    >
                        Log in
                    </button>
                </form>

                <p className="mt-4 text-center text-gray-400 text-sm">
                    Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300">Register</Link>
                </p>

            </div>
        </div>
    );
}
