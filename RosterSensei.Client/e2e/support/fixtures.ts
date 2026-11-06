import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { MockApi } from './mock-api';

export { expect };

// `api` is a fresh mock per test. Install it in the test (after setting up its data) with api.install(page).
export const test = base.extend<{ api: MockApi }>({
    api: async ({}, use) => {
        await use(new MockApi());
    },
});

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Picks an option in a select field by its label. Works with a native <select> and with a
 * custom combobox/listbox, so the tests don't depend on how the dropdown is drawn.
 */
export async function chooseOption(page: Page, control: Locator, optionText: string) {
    const startsWith = new RegExp(`^${escapeRegExp(optionText)}`);
    if (await control.evaluate(el => el.tagName === 'SELECT')) {
        const value = await control.locator('option').filter({ hasText: startsWith }).first().getAttribute('value');
        await control.selectOption(value!);
    } else {
        await control.click();
        await page.getByRole('option', { name: startsWith }).click();
    }
}

/** The element that has focus, for checking where focus went. */
export const focused = (page: Page) => page.locator('*:focus');

/** Whether the page scrolls sideways, measured on the document and the app's scroll container. */
export async function hasHorizontalScroll(page: Page) {
    return page.evaluate(() => {
        const roots = [document.documentElement, ...Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-root]'))];
        return roots.some(el => el.scrollWidth > el.clientWidth + 1);
    });
}
