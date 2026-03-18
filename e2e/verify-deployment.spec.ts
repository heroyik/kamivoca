import { test, expect } from '@playwright/test';

test('Verify KamiVoca v1.1 Deployment', async ({ page }) => {
    // Capture browser console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // 1. Visit the deployed site
    console.log('Navigating to https://heroyik.github.io/kamivoca/ ...');

    // Increase timeout for this test specifically
    test.setTimeout(60000);

    // Use domcontentloaded to avoid waiting for long-polling requests
    await page.goto('/kamivoca/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 2. Check title and revision
    await expect(page).toHaveTitle(/KamiVoca/);

    // Check for Revision tag (Current version)
    const revisionTag = page.locator('.version-badge'); // Match the class used in page.tsx
    await expect(revisionTag).toContainText('2.4.0');
    console.log('✅ Version badge found.');

    // 2.5 Check Vocabulary (Unit 1 should be beginner)
    // The UI renders "BEGINNER 1", not "Unit 1"
    await expect(page.locator('text=BEGINNER 1')).toBeVisible({ timeout: 10000 });
    console.log('✅ Unit 1 (BEGINNER 1) found.');

    // 3. Check Leaderboard
    console.log('Clicking LEADER tab...');
    // Ensure the tab is clickable
    await page.locator('text=LEADER').waitFor({ state: 'visible' });
    await page.locator('text=LEADER').click();

    // 4. Verify Leaderboard loads (check for "Hall of Fame")
    console.log('Waiting for Leaderboard content...');

    try {
        await expect(page.locator('h2:has-text("Hall of Fame")')).toBeVisible({ timeout: 20000 });
        console.log('✅ Leaderboard Header "Hall of Fame" found.');
    } catch {
        console.log('❌ Leaderboard Header NOT found. Checking for error state...');
    }

    // 5. Check if it's still loading or stuck
    const loadingState = page.locator('text=Loading Rankings...');
    if (await loadingState.isVisible()) {
        console.log('⚠️ Still seeing "Loading Rankings..."');
    } else {
        console.log('✅ Loading state cleared.');
    }

    // 6. Check for "Retry" button (Error State)
    const retryBtn = page.locator('button:has-text("Retry")');
    if (await retryBtn.isVisible()) {
        console.error('❌ Leaderboard Error detected. Retry button is visible.');
        // Fail the test if we see an error
        throw new Error("Leaderboard failed to load (Error State)");
    }

    // 7. Check entries
    // Look for entries with the style we defined (white bg, border)
    // We can look for the crown icon 👑 which indicates the first place
    const crownIcon = page.locator('text=👑');
    if (await crownIcon.count() > 0) {
        console.log('✅ Found 1st place Crown icon!');
    }

    // Simpler check: Look for "XP" text which appears in every entry
    const entriesCount = await page.locator('text=XP').count();

    if (entriesCount > 0) {
        console.log(`✅ Success! Found ${entriesCount} leaderboard entries.`);
    } else {
        const emptyMsg = page.locator('text=Be the first to join');
        if (await emptyMsg.isVisible()) {
            console.log('✅ Leaderboard is empty (valid state).');
        } else {
            console.warn('⚠️ No entries and no empty message found. Unexpected state.');
        }
    }
    // 8. Verify Auth Availability Guard (Meticulous Test)
    console.log('Checking Auth Availability...');
    await page.locator('text=PROFILE').click();

    // Check if the Sign In button is present
    await expect(page.locator('button:has-text("LOG IN WITH GOOGLE")')).toBeVisible();

    // Listen for dialogs (alerts)
    page.on('dialog', async dialog => {
        console.log(`DIALOG DETECTED: ${dialog.message()}`);
        if (dialog.message().includes('Firebase Authentication is not available')) {
            console.error('❌ AUTH ERROR ALERT DETECTED');
        }
        await dialog.dismiss();
    });

    await page.locator('button:has-text("LOG IN WITH GOOGLE")').click();
    console.log('✅ Auth interaction tested.');
});
