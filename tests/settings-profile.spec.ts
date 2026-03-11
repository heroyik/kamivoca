import { test, expect } from '@playwright/test';
import { seedTestState, defaultTestStats } from './test-utils';

test.describe('Settings & Profile', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestState(page, defaultTestStats);
  });

  test('should toggle Japanese study aids (Furigana)', async ({ page }) => {
    await page.click('div.nav-item:has-text("PROFILE")');
    
    // Toggle Hide Furigana
    const furiganaToggle = page.locator('.settings-item', { hasText: 'Hide Furigana' }).locator('.slider');
    await furiganaToggle.click();
    
    // Check localStorage persistence
    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('kamivoca_stats') || '{}'));
    expect(stats.settings.hideFurigana).toBe(true);
  });

  test('should persist avatar selection', async ({ page }) => {
    await page.click('div.nav-item:has-text("PROFILE")');
    
    // Click on Geisha avatar (index 2 in AVATARS)
    const geishaAvatar = page.locator('div:has(> img[alt="Avatar 2"])').first();
    // Use evaluate to bypass viewport/interception issues in headless
    await geishaAvatar.evaluate(el => (el as HTMLElement).click());
    
    // Check if profile header updates - it uses Image with alt as name or photoURL
    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('kamivoca_stats') || '{}'));
    expect(stats.photoURL).toContain('geisha.png');
  });

  test('should unlock all levels via settings', async ({ page }) => {
    await page.click('div.nav-item:has-text("PROFILE")');
    
    const unlockToggle = page.locator('.settings-item', { hasText: 'Unlock All Levels' }).locator('.slider');
    await unlockToggle.scrollIntoViewIfNeeded();
    await unlockToggle.click();
    
    await page.click('div.nav-item:has-text("LEARN")');
    
    // All 15 units should now have unlocked classes (not 'locked')
    const lockedNodes = page.locator('.unit-button.locked');
    await expect(lockedNodes).toHaveCount(0);
  });
});
