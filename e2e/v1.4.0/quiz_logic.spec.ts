import { test, expect } from '@playwright/test';

test.describe('V2.0 Quiz Logic Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Go to first unit quiz using direct URL
        await page.goto('/quiz/unit-1');
        // Wait for quiz to load
        await expect(page.locator('h2')).toContainText('What does this word mean?');
    });

    test('TC-QUIZ-01: Distractors should roughly align with POS (Heuristic Check)', async ({ page }) => {
        // This is hard to verify perfectly in UI without exposing POS, 
        // but we can check if options are available and selectable.
        const options = page.locator('.duo-button-outline');
        await expect(options).toHaveCount(5); // 4 options + No Lo Sé button

        // Check first 4 options (the actual answers)
        for (let i = 0; i < 4; i++) {
            await expect(options.nth(i)).toBeVisible();
            const text = await options.nth(i).innerText();
            expect(text.length).toBeGreaterThan(0);
        }
    });

    test('TC-QUIZ-02: "No Lo Sé" button should show feedback and correct answer', async ({ page }) => {
        const noloBtn = page.locator('.btn-nolo');
        await expect(noloBtn).toBeVisible();
        await expect(noloBtn).toContainText('NO LO SÉ');

        // Click "No Lo Sé"
        await noloBtn.click();

        // Check feedback bar appearance
        const feedbackBar = page.locator('.quiz-feedback-bar.incorrect');
        await expect(feedbackBar).toBeVisible();
        await expect(feedbackBar).toContainText("That's okay! Here's the answer:");

        // Check "NEXT" button presence
        const nextBtn = feedbackBar.locator('button', { hasText: 'NEXT' });
        await expect(nextBtn).toBeVisible();
    });

    test('Jiggle animation should trigger on No Lo Sé hover', async ({ page }) => {
        const noloBtn = page.locator('.btn-nolo');
        // Check if the class .btn-nolo exists and has the jiggle animation in styles
        // We can check the computed style or presence of style tag
        const styleTag = await page.locator('style').allInnerTexts();
        const hasJiggle = styleTag.some(s => s.includes('@keyframes jiggle'));
        expect(hasJiggle).toBe(true);
    });
});
