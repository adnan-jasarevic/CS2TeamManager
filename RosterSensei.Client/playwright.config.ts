import { defineConfig, devices } from '@playwright/test';

const PORT = 4180;

// Runs the production build against a mocked API: every request to /api is answered by the tests
// (see e2e/support/mock-api.ts), so no backend or database is needed.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        // Fixed so dates and times render the same on every machine.
        timezoneId: 'Europe/Sarajevo',
        locale: 'en-GB',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Same origin as the app, so the mocked responses need no CORS headers.
        env: { VITE_API_BASE_URL: '/api' },
    },
});
