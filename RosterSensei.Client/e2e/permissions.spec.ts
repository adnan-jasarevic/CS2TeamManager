import { test, expect } from './support/fixtures';
import { team } from './support/mock-api';

const cases = [
    { who: 'Owner (Captain)', role: 'Captain', isOwner: true, manage: true },
    { who: 'Owner (Player)', role: 'Player', isOwner: true, manage: true },
    { who: 'Captain', role: 'Captain', isOwner: false, manage: true },
    { who: 'Officer', role: 'Officer', isOwner: false, manage: true },
    { who: 'Player', role: 'Player', isOwner: false, manage: false },
] as const;

test.describe('what each role can do', () => {
    for (const c of cases) {
        test(`${c.who}`, async ({ page, api }) => {
            api.teams = [team(1, 'Tokyo Ronin', c.role, c.isOwner)];
            await api.install(page);

            // Inviting, recording matches and the calendar: Owner, Captain and Officers.
            await page.goto('/team');
            await expect(page.getByRole('table', { name: 'Members of Tokyo Ronin' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Invite player' })).toHaveCount(c.manage ? 1 : 0);

            // Roles, kicking, transferring and deleting: the Owner only.
            await expect(page.getByRole('button', { name: /^Actions for / })).toHaveCount(c.isOwner ? api.teams[0].members.length : 0);
            await expect(page.getByRole('button', { name: 'Delete team' })).toHaveCount(c.isOwner ? 1 : 0);

            // The Owner can't leave without handing the team over first; everyone else can.
            const leave = page.getByRole('button', { name: 'Leave team' });
            if (c.isOwner) await expect(leave).toBeDisabled();
            else await expect(leave).toBeEnabled();

            await page.goto('/matches');
            await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Add match' })).toHaveCount(c.manage ? 1 : 0);

            await page.goto('/dashboard');
            await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Add match' })).toHaveCount(c.manage ? 1 : 0);

            await page.goto('/calendar');
            await expect(page.getByRole('button', { name: 'Add event' })).toHaveCount(c.manage ? 1 : 0);
        });
    }

    test('a Player can leave the team', async ({ page, api }) => {
        api.teams = [team(1, 'Tokyo Ronin', 'Player', false), team(2, 'Osaka Oni', 'Captain', true)];
        await api.install(page);
        await page.goto('/team');

        await page.getByRole('button', { name: 'Leave team' }).click();
        const dialog = page.getByRole('dialog', { name: 'Leave team' });
        await dialog.getByRole('button', { name: 'Leave team' }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText('You left the team.')).toBeVisible();
        await expect(page.getByRole('table', { name: 'Members of Osaka Oni' })).toBeVisible();
        expect(api.requestsTo('POST', /^\/Teams\/1\/leave$/)).toHaveLength(1);
    });
});
