import { test, expect } from './support/fixtures';
import { finishedMatch, team } from './support/mock-api';

const PAGES = [
    { path: '/dashboard', endpoint: /^\/Teams\/1\/dashboard$/, loading: 'Loading recent matches', error: "Couldn't load this team", empty: 'No matches played yet' },
    { path: '/team', endpoint: /^\/Teams\/1\/members$/, loading: 'Loading players', error: "Couldn't load the roster", empty: 'No members found' },
    { path: '/matches', endpoint: /^\/Matches\/1$/, loading: 'Loading matches', error: "Couldn't load matches", empty: 'No matches yet' },
    { path: '/statistics', endpoint: /^\/Matches\/1\/stats/, loading: 'Loading statistics', error: "Couldn't load statistics", empty: null },
] as const;

for (const p of PAGES) {
    test.describe(`${p.path} states`, () => {
        test('shows a loading state, then the content', async ({ page, api }) => {
            api.teams = [team(1, 'Tokyo Ronin', 'Captain', true, { matches: [finishedMatch(1, 'Kyoto Kitsune', 13, 9, '2026-10-20T18:00:00Z')] })];
            const slow = api.hold('GET', p.endpoint);
            await api.install(page);
            await page.goto(p.path);
            await slow.requested;

            await expect(page.getByRole('status').filter({ hasText: p.loading })).toBeAttached();

            slow.release();
            await expect(page.getByRole('status').filter({ hasText: p.loading })).toHaveCount(0);
            await expect(page.getByRole('alert')).toHaveCount(0);
        });

        test('shows an error with a working retry', async ({ page, api }) => {
            api.teams = [team(1, 'Tokyo Ronin', 'Captain', true, { matches: [finishedMatch(1, 'Kyoto Kitsune', 13, 9, '2026-10-20T18:00:00Z')] })];
            const recover = api.fail('GET', p.endpoint, 500, 'The server fell over.');
            await api.install(page);
            await page.goto(p.path);

            const error = page.getByRole('alert').filter({ hasText: p.error });
            await expect(error).toBeVisible();
            await expect(error).toContainText('The server fell over.');

            recover();
            await error.getByRole('button', { name: 'Try again' }).click();
            await expect(error).toBeHidden();
            expect(api.requestsTo('GET', p.endpoint).length).toBeGreaterThanOrEqual(2);
        });

        if (p.empty) {
            test('shows an empty state when there is nothing yet', async ({ page, api }) => {
                api.teams = [team(1, 'Tokyo Ronin', 'Captain', true, { members: [] })];
                await api.install(page);
                await page.goto(p.path);

                await expect(page.getByText(p.empty, { exact: true })).toBeVisible();
            });
        }
    });
}

test.describe('team list', () => {
    test('when it fails to load, every team page offers a retry', async ({ page, api }) => {
        const recover = api.fail('GET', /^\/Teams\/my-teams$/, 500);
        await api.install(page);
        await page.goto('/matches');

        const error = page.getByRole('alert').filter({ hasText: "Couldn't load your teams" });
        await expect(error).toBeVisible();

        recover();
        await error.getByRole('button', { name: 'Try again' }).click();
        await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible();
        await expect(error).toBeHidden();
    });

    test('a user with no team is offered to create one', async ({ page, api }) => {
        api.teams = [];
        await api.install(page);
        await page.goto('/dashboard');

        await expect(page.getByText("You're not on a team yet")).toBeVisible();
        await page.getByRole('button', { name: 'Create a team' }).click();
        const dialog = page.getByRole('dialog', { name: 'Create a new team' });
        await dialog.getByLabel('Team name').fill('  Nagoya Ninjas  ');
        await dialog.getByRole('button', { name: 'Create team' }).click();

        await expect(dialog).toBeHidden();
        expect(api.requestsTo('POST', /^\/Teams$/)[0].body).toEqual({ name: 'Nagoya Ninjas' });
        await expect(page.getByLabel('Team', { exact: true })).toBeVisible();
    });

    test('the 3-team limit error is shown in the create dialog', async ({ page, api }) => {
        api.on('POST', /^\/Teams$/, () => ({ status: 400, json: { message: 'You can own at most 3 teams.' } }));
        await api.install(page);
        await page.goto('/dashboard');

        await page.getByRole('button', { name: 'New team' }).click();
        const dialog = page.getByRole('dialog', { name: 'Create a new team' });
        await dialog.getByLabel('Team name').fill('Fourth Team');
        await dialog.getByRole('button', { name: 'Create team' }).click();

        await expect(dialog.getByText('You can own at most 3 teams.')).toBeVisible();
        await expect(dialog).toBeVisible();
    });
});
