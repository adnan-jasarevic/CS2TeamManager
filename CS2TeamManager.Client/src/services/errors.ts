import axios from 'axios';

// Turns an API error into a readable message. Handles both the { message } responses
// from the controllers and the ValidationProblemDetails returned by the validation filter.
export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (!axios.isAxiosError(err) || !err.response?.data) return fallback;

    const data = err.response.data as { message?: string; errors?: Record<string, string[]> };

    if (data.errors) {
        const messages = Object.values(data.errors).flat();
        if (messages.length > 0) return messages.join(' ');
    }

    return data.message || fallback;
}
