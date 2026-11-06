import { test, expect } from './support/fixtures';

test.describe('logging in', () => {
    test('a correct password stores the token and opens the dashboard', async ({ page, api }) => {
        await api.install(page, { signedIn: false });
        await page.goto('/login');

        await page.getByLabel('Email').fill('sensei@example.com');
        await page.getByLabel('Password', { exact: true }).fill('correct-horse');
        await page.getByRole('button', { name: 'Log in' }).click();

        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBe('test-token');
        expect(api.requestsTo('POST', /^\/Auth\/login$/)[0].body).toEqual({ email: 'sensei@example.com', password: 'correct-horse' });
    });

    test('a wrong password shows an error and stays on the login page', async ({ page, api }) => {
        await api.install(page, { signedIn: false });
        await page.goto('/login');

        await page.getByLabel('Email').fill('sensei@example.com');
        await page.getByLabel('Password', { exact: true }).fill('wrong');
        await page.getByRole('button', { name: 'Log in' }).click();

        await expect(page.getByText('Invalid email or password')).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });

    test('private pages send a signed-out user to the login page', async ({ page, api }) => {
        await api.install(page, { signedIn: false });
        await page.goto('/team');

        await expect(page).toHaveURL(/\/login$/);
    });

    test('an expired token sends the user back to the login page', async ({ page, api }) => {
        api.on('GET', /^\/Teams\/my-teams$/, () => ({ status: 401 }));
        await api.install(page);
        await page.goto('/dashboard');

        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBeNull();
    });

    test('logging out clears the token', async ({ page, api }) => {
        await api.install(page);
        await page.goto('/dashboard');
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

        await page.getByRole('button', { name: 'Log out' }).first().click();

        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => localStorage.getItem('jwt_token'))).toBeNull();
    });
});
