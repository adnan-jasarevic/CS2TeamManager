import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, hasHorizontalScroll } from './support/fixtures';
import { finishedMatch, team, type MockApi } from './support/mock-api';

const PAGES = [
    { path: '/login', heading: 'Welcome back', signedIn: false },
    { path: '/register', heading: 'Create your account', signedIn: false },
    { path: '/dashboard', heading: 'Dashboard', signedIn: true },
    { path: '/team', heading: 'Team roster', signedIn: true },
    { path: '/calendar', heading: 'Calendar', signedIn: true },
    { path: '/matches', heading: 'Matches', signedIn: true },
    { path: '/statistics', heading: 'Statistics', signedIn: true },
];

function withData(api: MockApi) {
    api.teams = [team(1, 'Tokyo Ronin', 'Captain', true, {
        matches: [
            finishedMatch(1, 'Kyoto Kitsune', 13, 9, '2026-10-20T18:00:00Z'),
            finishedMatch(2, 'Osaka Oni', 7, 13, '2026-10-27T18:00:00Z'),
        ],
    })];
}

async function open(page: Page, api: MockApi, path: string, signedIn: boolean, heading: string) {
    await api.install(page, { signedIn });
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    // Wait for skeletons to be replaced and entrance animations to finish.
    await expect(page.getByRole('status').filter({ hasText: /^Loading/ })).toHaveCount(0);
    await page.waitForTimeout(400);
}

for (const theme of ['dark', 'light'] as const) {
    test.describe(`accessibility scan, ${theme} theme`, () => {
        for (const p of PAGES) {
            test(p.path, async ({ page, api }) => {
                withData(api);
                await page.addInitScript(t => localStorage.setItem('rs-theme', t), theme);
                await open(page, api, p.path, p.signedIn, p.heading);
                expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

                const results = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
                    .analyze();

                expect(results.violations.map(v => `${v.id}: ${v.help} (${v.nodes.map(n => n.target.join(' ')).join(', ')})`)).toEqual([]);
            });
        }
    });
}

test.describe('no sideways scrolling at 320px', () => {
    test.use({ viewport: { width: 320, height: 640 } });

    for (const p of PAGES) {
        test(p.path, async ({ page, api }) => {
            withData(api);
            await open(page, api, p.path, p.signedIn, p.heading);

            expect(await hasHorizontalScroll(page)).toBe(false);
        });
    }

    test('the Add Match dialog', async ({ page, api }) => {
        withData(api);
        await open(page, api, '/matches', true, 'Matches');
        await page.getByRole('button', { name: 'Add match' }).click();
        await expect(page.getByRole('dialog', { name: 'Add match' })).toBeVisible();

        const overflows = await page.getByRole('dialog').evaluate(d => d.scrollWidth > d.clientWidth + 1 || d.getBoundingClientRect().width > window.innerWidth);
        expect(overflows).toBe(false);
    });
});
