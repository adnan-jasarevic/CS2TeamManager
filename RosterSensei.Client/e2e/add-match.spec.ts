import { test, expect, chooseOption } from './support/fixtures';

test.describe('Add Match', () => {
    test('sends a finished Bo3 with map and half scores in play order', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/matches');

        await page.getByRole('button', { name: 'Add match' }).click();
        const dialog = page.getByRole('dialog', { name: 'Add match' });

        await dialog.getByRole('radio', { name: 'Scrim' }).check({ force: true });
        await dialog.getByLabel('Opponent').fill('  Kyoto Kitsune ');
        await dialog.getByLabel('Tournament').fill('Local LAN Cup');
        // The test browser runs in Europe/Sarajevo (UTC+1 in November).
        await dialog.getByLabel('Date and time').fill('2026-11-20T19:00');
        await chooseOption(page, dialog.getByLabel('Status'), 'Finished');
        await dialog.getByRole('radio', { name: 'Bo3' }).check({ force: true });

        // Picked out of alphabetical order: the request must keep the play order.
        for (const map of ['Nuke', 'Ancient', 'Mirage']) {
            await dialog.getByRole('button', { name: map }).click();
        }
        // A Bo3 holds three maps; the rest are disabled.
        await expect(dialog.getByRole('button', { name: 'Inferno' })).toBeDisabled();

        const score = async (map: string, values: [string, string, string, string, string, string]) => {
            const labels = ['our final score', 'opponent final score', 'our first half', 'opponent first half', 'our second half', 'opponent second half'];
            for (let i = 0; i < labels.length; i++) await dialog.getByLabel(`${map} ${labels[i]}`).fill(values[i]);
        };
        await score('Nuke', ['13', '8', '7', '5', '6', '3']);
        await score('Ancient', ['10', '13', '5', '7', '5', '6']);
        // Overtime: the final is more than both halves added up. Halves left out are not sent.
        await dialog.getByLabel('Mirage our final score').fill('16');
        await dialog.getByLabel('Mirage opponent final score').fill('14');

        await expect(dialog.getByText('2 - 1', { exact: true })).toBeVisible();
        await dialog.getByLabel('Notes').fill('  Good comms.  ');
        await dialog.getByRole('button', { name: 'Add match' }).click();
        await expect(dialog).toBeHidden();

        const [request] = api.requestsTo('POST', /^\/Matches\/1$/);
        expect(request.body).toEqual({
            opponentName: 'Kyoto Kitsune',
            tournament: 'Local LAN Cup',
            scheduledDate: '2026-11-20T18:00:00.000Z',
            playedDate: '2026-11-20T18:00:00.000Z',
            status: 2,
            type: 1,
            ourScore: 0,
            opponentScore: 0,
            bestOf: 3,
            maps: [
                { mapName: 'Nuke', ourScore: 13, opponentScore: 8, ourFirstHalf: 7, opponentFirstHalf: 5, ourSecondHalf: 6, opponentSecondHalf: 3 },
                { mapName: 'Ancient', ourScore: 10, opponentScore: 13, ourFirstHalf: 5, opponentFirstHalf: 7, ourSecondHalf: 5, opponentSecondHalf: 6 },
                { mapName: 'Mirage', ourScore: 16, opponentScore: 14 },
            ],
            notes: 'Good comms.',
        });
        // The list reloads after saving.
        await expect.poll(() => api.requestsTo('GET', /^\/Matches\/1$/).length).toBeGreaterThanOrEqual(2);
    });

    test('a scheduled match sends no scores', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/matches');

        await page.getByRole('button', { name: 'Add match' }).click();
        const dialog = page.getByRole('dialog', { name: 'Add match' });
        await dialog.getByLabel('Opponent').fill('Sapporo Snow');
        await dialog.getByLabel('Date and time').fill('2026-12-01T20:30');
        await dialog.getByRole('button', { name: 'Dust2' }).click();
        await dialog.getByRole('button', { name: 'Add match' }).click();
        await expect(dialog).toBeHidden();

        expect(api.requestsTo('POST', /^\/Matches\/1$/)[0].body).toEqual({
            opponentName: 'Sapporo Snow',
            scheduledDate: '2026-12-01T19:30:00.000Z',
            status: 0,
            type: 0,
            ourScore: 0,
            opponentScore: 0,
            bestOf: 1,
            maps: [{ mapName: 'Dust2' }],
        });
    });

    test('explains missing fields on the fields themselves and sends nothing', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/matches');

        await page.getByRole('button', { name: 'Add match' }).click();
        const dialog = page.getByRole('dialog', { name: 'Add match' });
        await dialog.getByRole('button', { name: 'Add match' }).click();

        await expect(dialog.getByText("Enter the opponent's name.")).toBeVisible();
        await expect(dialog.getByText('Pick a date and time.')).toBeVisible();
        await expect(dialog.getByLabel('Opponent')).toHaveAttribute('aria-invalid', 'true');
        expect(api.requestsTo('POST', /^\/Matches\/1$/)).toHaveLength(0);
    });

    test('shows the API error inside the dialog and keeps what was typed', async ({ page, api }) => {
        api.on('POST', /^\/Matches\/1$/, () => ({ status: 400, json: { message: 'Bo1 matches can have only one map.' } }));
        await api.install(page);
        await page.goto('/matches');

        await page.getByRole('button', { name: 'Add match' }).click();
        const dialog = page.getByRole('dialog', { name: 'Add match' });
        await dialog.getByLabel('Opponent').fill('Kobe Kaiju');
        await dialog.getByLabel('Date and time').fill('2026-12-01T20:30');
        await dialog.getByRole('button', { name: 'Add match' }).click();

        await expect(dialog.getByText('Bo1 matches can have only one map.')).toBeVisible();
        await expect(dialog.getByLabel('Opponent')).toHaveValue('Kobe Kaiju');
    });
});
