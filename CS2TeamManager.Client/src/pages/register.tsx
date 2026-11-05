import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import AuthLayout from '../components/auth-layout';
import { Alert, Button, Field, Input, PasswordInput } from '../components/ui';

type RegisterRequest = {
    username: string;
    email: string;
    password: string;
};

type RegisterResponse = {
    message: string;
};

// Identity's errors, returned as an array when registration fails.
type IdentityError = {
    code: string;
    description: string;
};

const REDIRECT_DELAY_MS = 2000;

const registerErrorMessage = (err: unknown) => {
    if (axios.isAxiosError<IdentityError[]>(err) && Array.isArray(err.response?.data) && err.response.data.length > 0) {
        // Identity reports every broken password rule at once, so show them all.
        return err.response.data.map(e => e.description).join(' ');
    }
    if (axios.isAxiosError(err) && !err.response) return "Can't reach the server. Check your connection and try again.";
    return getApiErrorMessage(err, 'Registration failed. Please try again.');
};

export default function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [mismatch, setMismatch] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // The timer is cleared if the user leaves first, so it can't pull them back to the login page.
    useEffect(() => {
        if (!successMessage) return;
        const timer = setTimeout(() => navigate('/login'), REDIRECT_DELAY_MS);
        return () => clearTimeout(timer);
    }, [successMessage, navigate]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setMismatch(true);
            return;
        }
        setMismatch(false);
        setIsSubmitting(true);

        const payload: RegisterRequest = { username, email, password };

        try {
            const response = await api.post<RegisterResponse>('/Auth/register', payload);
            setSuccessMessage(`${response.data?.message?.replace(/\.$/, '') || 'Account created'}. Redirecting to login...`);
        } catch (err: unknown) {
            setError(registerErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Set up your roster in a couple of minutes."
            footer={<>Already have an account? <Link to="/login" className="font-semibold text-accent-text underline-offset-4 hover:underline">Log in</Link></>}
        >
            {successMessage ? (
                <Alert tone="success">{successMessage}</Alert>
            ) : (
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    {error && <Alert tone="danger">{error}</Alert>}

                    <Field label="Username">
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your nickname" autoComplete="username" required />
                    </Field>

                    <Field label="Email">
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                    </Field>

                    <Field label="Password">
                        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                    </Field>

                    <Field label="Confirm password" error={mismatch ? 'Passwords do not match.' : undefined}>
                        <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
                    </Field>

                    <Button type="submit" size="lg" fullWidth loading={isSubmitting} loadingText="Creating account..." className="mt-2">
                        Register
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}
