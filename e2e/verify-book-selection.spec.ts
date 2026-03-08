
import { test, expect } from '@playwright/test';

test('Verify Textbook Selection Feature', async ({ page }) => {
    // 1. Visit the site
    await page.goto('/kamivoca/', { waitUntil: 'domcontentloaded' });

    // 2. Check initial state (Vol 1 selected by default)
    // The pill contains the count (538)
    const stashPill = page.locator('.vocab-stash-pill strong');
    await expect(stashPill).toHaveText('538');
    console.log('✅ Initial state verified: 538 words');

    // 3. Click Vol 2 (Enable) -> Should be Vol 1 + Vol 2
    await page.locator('img[alt="Book 2"]').click();
    await expect(stashPill).toHaveText('721');
    console.log('✅ Vol 2 enabled: 721 words');

    // 4. Click Vol 1 (Disable) -> Should be Vol 2 only
    await page.locator('img[alt="Book 1"]').click();
    await expect(stashPill).toHaveText('183');
    console.log('✅ Vol 1 disabled: 183 words');

    // 5. Try to disable Vol 2 (Should be prevented, last book)
    await page.locator('img[alt="Book 2"]').click();
    await expect(stashPill).toHaveText('183');
    console.log('✅ Prevented disabling last book');
});
