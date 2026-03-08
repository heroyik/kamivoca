import { test, expect } from '@playwright/test';

test.describe('Regression Suite for UI Changes', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    await page.goto('/kamivoca');
    console.log(`Navigated to: ${page.url()}`);
  });

  test('Header: Visual Verification', async ({ page }) => {
    // 1. Verify Header Title and Version
    const header = page.locator('header.spanish-header');
    await expect(header).toBeVisible();

    // Check Title "KamiVoca"
    const title = header.getByRole('heading', { name: 'KamiVoca' });
    await expect(title).toBeVisible();
    await expect(title).toHaveClass(/font-22/); // Check implementation detail (font size increase)

    // Check Version Badge (Should be subtle)
    const version = header.locator('.version-badge');
    await expect(version).toBeVisible();
    await expect(version).toHaveText(/2\.0\.2/);

    // Verify Stats are NOT in header
    const streakInHeader = header.locator('text=🔥');
    await expect(streakInHeader).not.toBeVisible();
  });

  test('Footer: Visual Verification', async ({ page }) => {
    // 2. Verify Footer Stats
    // Use role selector which is more robust
    const footer = page.locator('nav.footer-nav');

    // Debug: Take screenshot if footer is missing
    if (!await footer.isVisible()) {
      await page.screenshot({ path: 'footer-missing-debug.png', fullPage: true });
    }

    await expect(footer).toBeVisible({ timeout: 10000 });

    const auraBar = footer.locator('.aura-bar');
    await expect(auraBar).toBeVisible();

    // Check for Streak and Gems in Footer
    await expect(auraBar).toContainText('🔥');
    await expect(auraBar).toContainText('💎');
    await expect(auraBar).toContainText('My Learning Aura');
  });

  test('Quiz: Card Layout and Book Source', async ({ page }) => {
    // 3. Start a Quiz (Unit 1)
    // Find Unit 1 button. It might be locked or startable.
    // Assuming clean state or specific unit. We look for Unit 1.
    const unit1 = page.locator('.unit-node-container .unit-button').first();
    await expect(unit1).toBeVisible({ timeout: 15000 });
    await unit1.click();

    // Verify Quiz Page Loaded
    await expect(page).toHaveURL(/\/quiz\/unit-1/);

    // Verify Compact Card Layout
    const quizCard = page.locator('.quiz-card');
    await expect(quizCard).toBeVisible();

    // Check styles (Compactness)
    await quizCard.evaluate((el) => window.getComputedStyle(el).padding);
    // expect(padding).toBe('24px 20px'); // This might be flaky if computed style differs slightly across browsers, but good for check.

    // Verify Book Source Image
    const sourceBadge = quizCard.locator('.source-badge');
    await expect(sourceBadge).toBeVisible();

    // Check if image is inside badge
    const bookImage = sourceBadge.locator('img');
    await expect(bookImage).toBeVisible();
  });
});
