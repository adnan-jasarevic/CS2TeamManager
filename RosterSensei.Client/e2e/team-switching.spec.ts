import { test, expect, chooseOption } from './support/fixtures';
import { member, team } from './support/mock-api';

test.describe('switching teams', () => {
    test.beforeEach(({ api }) => {
        api.teams = [
            team(1, 'Tokyo Ronin', 'Captain', true, { members: [member('me', 'Captain', { username: 'sensei', isOwner: true }), member('ronin-player', 'Player')] }),
            team(2, 'Osaka Oni', 'Player', false, { members: [member('oni-captain', 'Captain', { isOwner: true }), member('me', 'Player', { username: 'sensei' })] }),
        ];
    });

    test('a slow response for the previous team does not overwrite the team you switched to', async ({ page, api }) => {
        const slowFirstTeam = api.hold('GET', /^\/Teams\/1\/members$/);
        await api.install(page);
        await page.goto('/team');
        await slowFirstTeam.requested;

        await chooseOption(page, page.getByLabel('Team', { exact: true }), 'Osaka Oni');
        await expect(page.getByText('oni-captain', { exact: true })).toBeVisible();

        // Team 1's answer finally arrives, after the user has moved on.
        slowFirstTeam.release();
        await page.waitForTimeout(300);

        await expect(page.getByText('oni-captain', { exact: true })).toBeVisible();
        await expect(page.getByText('ronin-player', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('table', { name: 'Members of Osaka Oni' })).toBeVisible();
    });

    test('the chosen team is remembered after a reload', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/team');
        await expect(page.getByText('ronin-player', { exact: true })).toBeVisible();

        await chooseOption(page, page.getByLabel('Team', { exact: true }), 'Osaka Oni');
        await expect(page.getByText('oni-captain', { exact: true })).toBeVisible();
        await page.reload();

        await expect(page.getByText('oni-captain', { exact: true })).toBeVisible();
    });

    test('a remembered team the user is no longer in falls back to the first team', async ({ page, api }) => {
        await page.addInitScript(() => localStorage.setItem('rs-selected-team', '99'));
        await api.install(page);
        await page.goto('/team');

        await expect(page.getByText('ronin-player', { exact: true })).toBeVisible();
    });
});
