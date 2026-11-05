import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './theme-context';

// The inline script in index.html reads this same key before first paint.
const STORAGE_KEY = 'rs-theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#0e0b0c', light: '#faf7f4' };

// Dark is the default whatever the OS prefers: it's how players use the app in practice.
const readStoredTheme = (): Theme => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark'; // Storage can be blocked (private mode).
    }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
    }, [theme]);

    // Keeps other open tabs in step.
    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) setThemeState(event.newValue === 'light' ? 'light' : 'dark');
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // The choice just won't be remembered next visit.
        }
    }, []);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
        [theme, setTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
