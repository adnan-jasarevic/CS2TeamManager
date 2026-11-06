import { test, expect, focused, chooseOption } from './support/fixtures';

test.describe('roster action menu', () => {
    test('works with the keyboard: arrows move, Esc closes and returns focus', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/team');

        const trigger = page.getByRole('button', { name: 'Actions for kenji' });
        await trigger.focus();
        await page.keyboard.press('Enter');

        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem').first()).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(menu.getByRole('menuitem', { name: /Transfer ownership/ })).toBeFocused();
        await page.keyboard.press('End');
        await expect(menu.getByRole('menuitem', { name: 'Kick player' })).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(menu.getByRole('menuitem', { name: 'Change role' })).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(menu.getByRole('menuitem', { name: 'Kick player' })).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('transfer is unavailable for a non-Officer and says why', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/team');

        await page.getByRole('button', { name: 'Actions for kenji' }).click();
        const transfer = page.getByRole('menuitem', { name: /Transfer ownership/ });
        await expect(transfer).toHaveAttribute('aria-disabled', 'true');
        await expect(transfer).toContainText('Make them an Officer first');

        // aria-disabled keeps it focusable and readable, so it can still be clicked: nothing happens.
        await transfer.click({ force: true });
        await expect(page.getByRole('dialog')).toBeHidden();
    });

    test('after kicking a player, focus stays in the page instead of being lost', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/team');

        await page.getByRole('button', { name: 'Actions for kenji' }).click();
        await page.getByRole('menuitem', { name: 'Kick player' }).click();
        const dialog = page.getByRole('dialog', { name: 'Kick player' });
        await dialog.getByRole('button', { name: 'Kick player' }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByRole('button', { name: 'Actions for kenji' })).toHaveCount(0);
        await expect(page.getByText('Removed kenji from the team.')).toBeVisible();
        const tag = await focused(page).evaluate(el => el.id || el.tagName).catch(() => 'BODY');
        expect(tag).not.toBe('BODY');
        expect(api.requestsTo('DELETE', /^\/Teams\/1\/members\/kenji$/)).toHaveLength(1);
    });

    test('changing a role sends the new role', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/team');

        await page.getByRole('button', { name: 'Actions for kenji' }).click();
        await page.getByRole('menuitem', { name: 'Change role' }).click();
        const dialog = page.getByRole('dialog', { name: 'Change role: kenji' });
        const role = dialog.getByLabel('Role', { exact: true });
        await expect(role).toBeFocused();
        await chooseOption(page, role, 'Officer');
        await dialog.getByRole('button', { name: 'Save role' }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText('kenji is now an Officer.')).toBeVisible();
        expect(api.requestsTo('PUT', /^\/Teams\/1\/members\/kenji\/role$/)[0].body).toEqual({ newRole: 'Officer' });
    });
});
