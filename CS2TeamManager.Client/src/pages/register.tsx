import React, { useState } from 'react';
import api from '../services/api';
import axios, { AxiosError } from 'axios';

// Expected shape of the request sent to C# backend
type RegisterRequest = {
    username: string;
    email: string;
    password: string;
};

// Expected success response from C# (Ok(new { message = "..." }))
type RegisterResponse = {
    message: string;
};

// Expected error response from C# Identity (BadRequest(result.Errors))
type IdentityError = {
    code: string;
    description: string;
};

function isAxiosError<T>(error: unknown): error is AxiosError<T> {
    return axios.isAxiosError(error);
}

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const payload: RegisterRequest = { username, email, password };

        try {
            const response = await api.post<RegisterResponse>('/Auth/register', payload);

            if (response.data && response.data.message) {
                setSuccessMessage(`${response.data.message}. You can now log in.`);
            } else {
                setSuccessMessage('Account created successfully. You can now log in.');
            }

            setUsername('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');

        } catch (err: unknown) {
            console.error('Error while trying to register:', err);

            if (isAxiosError<IdentityError[]>(err)) {
                const errors = err.response?.data;

                if (Array.isArray(errors) && errors.length > 0) {
                    setError(errors[0].description);
                    return;
                }
            }

            setError('Registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
                <h2 className="text-3xl font-bold text-white text-center mb-6">
                    Create Account
                </h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4 text-sm text-center">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Your nickname"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="you@example.com"
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

                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mt-6"
                    >
                        Register
                    </button>
                </form>

                <p className="mt-4 text-center text-gray-400 text-sm">
                    Already have an account?{' '}
                    <a href="#" className="text-blue-400 hover:text-blue-300">
                        Log in
                    </a>
                </p>
            </div>
        </div>
    );
}
