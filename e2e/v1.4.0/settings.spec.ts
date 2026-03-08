import { test, expect } from '@playwright/test';

test.describe('V2.0 Settings & Customization Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/kamivoca');
        // Switch to profile tab
        await page.getByText('PROFILE', { exact: true }).click();
        await expect(page.locator('.profile-container')).toBeVisible();
    });

    test('TC-SET-01: Exclude Easy Cognates toggle should affect word count', async ({ page }) => {
        // 1. Get initial count
        const initialStash = await page.locator('.vocab-stash-pill strong').innerText();
        const initialCount = parseInt(initialStash.replace(',', ''));

        // 2. Toggle "Exclude Easy Cognates"
        const toggle = page.locator('.settings-item', { hasText: 'Exclude Easy Cognates' }).locator('.slider');
        await toggle.click();

        // 3. Check if count decreased
        const newStash = await page.locator('.vocab-stash-pill strong').innerText();
        const newCount = parseInt(newStash.replace(',', ''));

        expect(newCount).toBeLessThan(initialCount);
    });

    test('TC-SET-02: Unlock All Levels toggle should enable Level 15', async ({ page }) => {
        // 1. Check if Level 15 is locked initially (assuming fresh session)
        await page.getByText('LEARN', { exact: true }).click();
        const level15Node = page.locator('.unit-node-container').nth(14); // 0-indexed
        await expect(level15Node.locator('.unit-button')).toHaveClass(/locked/);

        // 2. Go back and toggle
        await page.getByText('PROFILE', { exact: true }).click();
        const unlockToggle = page.locator('.settings-item', { hasText: 'Unlock All Levels' }).locator('.slider');
        await unlockToggle.click();

        // 3. Check if Level 15 is now accessible
        await page.getByText('LEARN', { exact: true }).click();
        await expect(level15Node.locator('.unit-button')).not.toHaveClass(/locked/);
    });
});
