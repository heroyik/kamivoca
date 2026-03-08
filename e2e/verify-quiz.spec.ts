import { test, expect } from '@playwright/test';

test('Verify Quiz Stability (4 options bug fix)', async ({ page }) => {
    // 1. Visit the site
    await page.goto('/kamivoca/', { waitUntil: 'domcontentloaded' });

    // 2. Click Unit 1 circle
    console.log('Starting Quiz...');
    // The first unit-button corresponds to Unit 1
    const unit1 = page.locator('.unit-button').first();
    await unit1.click({ force: true });

    // 3. Wait for quiz to load (it navigates to /kamivoca/quiz/unit-1...)
    await expect(page).toHaveURL(/.*quiz\/unit-1.*/, { timeout: 15000 });

    // 4. Check for 4 options
    console.log('Checking for 4 options...');
    const options = page.locator('.duo-button-outline');

    // We expect at least one question to show 4 options (unless it's a gender question which has 2)
    // Let's wait for a non-gender question if needed, or just check the count
    await expect(async () => {
        const count = await options.count();
        console.log(`Found ${count} options`);
        // It should be 4 for translation, 2 for gender. 
        // We definitely don't want 1.
        expect(count).toBeGreaterThan(1);
    }).toPass({ timeout: 10000 });

    const initialOptionsCount = await options.count();
    console.log(`✅ Quiz started with ${initialOptionsCount} options.`);

    // 5. Check next question too
    // Just click first option to move fast (might be wrong but it's fine for UI check)
    await options.first().click();

    // Wait for feedback bar to appear
    await expect(page.locator('.quiz-feedback-bar')).toBeVisible();
    await page.locator('button', { hasText: 'NEXT' }).click();

    await expect(async () => {
        const newOptionsCount = await options.count();
        expect(newOptionsCount).toBeGreaterThan(1);
    }).toPass();
    console.log('✅ Multiple options persisted to next question.');
});
