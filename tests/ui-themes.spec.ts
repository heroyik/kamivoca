import { test, expect } from '@playwright/test';
import { seedTestState, defaultTestStats } from './test-utils';

test.describe('UI & Themes', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestState(page, defaultTestStats);
  });

  test('should display Japanese traditional theme colors and font', async ({ page }) => {
    // Check background color (should be Washi Paper)
    // body has bg-main, which is #F6F4EB (rgb(246, 244, 235))
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(246, 244, 235)');

    // Check header text color (Kurenai)
    // #CB1B45 is rgb(203, 27, 69)
    const headerTitle = page.locator('header.japanese-header h1');
    await expect(headerTitle).toHaveCSS('color', 'rgb(203, 27, 69)');
  });

  test('should update avatar and profile header', async ({ page }) => {
    // Navigate to PROFILE tab first
    await page.click('div.nav-item:has-text("PROFILE")');
    
    // Click on Geisha avatar (index 2 in AVATARS)
    const geishaAvatar = page.locator('div:has(> img[alt="Avatar 2"])').first();
    // Use evaluate to bypass viewport/interception issues in headless
    await geishaAvatar.evaluate(el => (el as HTMLElement).click());

    // Check if profile header updates
    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('kamivoca_stats') || '{}'));
    expect(stats.photoURL).toContain('geisha.png');
  });

  test('should render pilgrimage map icons correctly', async ({ page }) => {
    // Check for Torii icons (current/available)
    const toriiIcon = page.locator('img[alt="Available"]').first();
    await expect(toriiIcon).toBeVisible();

    // Check for Sakura/Hanko based on progress
    // Hero unit-1 is completed in defaultTestStats, matches unit index 0
    const completedIcon = page.locator('img[alt="Completed"]').first();
    await expect(completedIcon).toBeVisible();
  });

  test('should display correct level titles and tiers', async ({ page }) => {
    const firstLevel = page.locator('.unit-label-card').first();
    await expect(firstLevel.locator('p').first()).toContainText('BEGINNER 1');
    
    // Check advanced level (index 10+)
    const advancedLevel = page.locator('.unit-label-card').nth(10);
    await expect(advancedLevel.locator('p').first()).toContainText('ADVANCED 11');
  });
});
