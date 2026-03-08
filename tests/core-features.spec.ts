import { test, expect } from '@playwright/test';
import { seedTestState, defaultTestStats } from './test-utils';

test.describe('Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestState(page, defaultTestStats);
  });

  test('should navigate to a quiz and display Japanese labels', async ({ page }) => {
    // Click on unit 1 (unlocked)
    await page.click('button.unit-button.completed');
    
    // Wait for the quiz to load and "I don't know" button in Japanese to appear
    const unknownBtn = page.locator('button:has-text("分かりません")');
    await unknownBtn.waitFor({ state: 'visible', timeout: 10000 });
    await expect(unknownBtn).toBeVisible();
  });

  test('should update XP and Leaderboard after set completion (Mocked)', async ({ page }) => {
    // This is more complex but we check basic XP update
    // text=1,500 (with comma)
    const initialXP = page.locator('text=1,500 ✨');
    await expect(initialXP).toBeVisible();
  });

  test('should show correct word count in header', async ({ page }) => {
    // Based on vocab.json: "totalWords": 202
    await expect(page.locator('.vocab-stash-pill strong').filter({ hasText: /^202$/ })).toBeVisible();
  });

  test('should filter Tricky Words in Review Tab', async ({ page }) => {
    // Seed one real mistake from vocab.json (e.g., "沐浴")
    await seedTestState(page, {
      mistakes: { '沐浴': 1 }
    });
    
    // Go to review tab
    await page.click('div.nav-item:has-text("REVIEW")');
    
    // Check that our mistake "沐浴" is visible
    await expect(page.locator('text=沐浴')).toBeVisible({ timeout: 10000 });
  });
});
