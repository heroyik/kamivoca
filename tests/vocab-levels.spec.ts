import { test, expect } from '@playwright/test';
import { seedTestState, defaultTestStats } from './test-utils';

test.describe('Vocabulary and Levels', () => {
  test.beforeEach(async ({ page }) => {
    // Unlock all levels to test deep into the levels
    await seedTestState(page, {
      ...defaultTestStats,
      settings: {
        ...defaultTestStats.settings,
        unlockAllLevels: true
      }
    });
    // Navigate specifically to /kamivoca/ as the app is hosted there
    await page.goto('/kamivoca/');
  });

  test('should show 15 levels on the map', async ({ page }) => {
    // Wait for the unit buttons to render
    const levelButtons = page.locator('.unit-button');
    await levelButtons.first().waitFor({ state: 'visible' });
    
    const count = await levelButtons.count();
    console.log(`Found ${count} level buttons`);
    expect(count).toBeGreaterThanOrEqual(15);
  });

  test('should display furigana correctly in examples during quiz', async ({ page }) => {
    // Click on Level 1 (using more specific selector if possible)
    const level1Btn = page.locator('.unit-button:has-text("1")').first();
    await level1Btn.click();
    
    // Wait for quiz container
    const quizContainer = page.locator('.quiz-wrapper, .quiz-container');
    await quizContainer.waitFor({ state: 'visible', timeout: 15000 });

    // Look for ruby tags in the example sentence section
    // The example sentence is rendered with <ruby> tags based on Quiz.tsx logic
    const rubyTags = page.locator('ruby');
    await expect(rubyTags.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have even word count label in the stash', async ({ page }) => {
    // We processed 1383 words
    const stashPill = page.locator('.vocab-stash-pill strong');
    await expect(stashPill).toContainText('1,383');
  });
});
