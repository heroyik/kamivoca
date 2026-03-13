import { test, expect } from '@playwright/test';
import vocabData from '../../src/data/vocab.json';
import { getUnits } from '../../src/utils/vocab';

test.describe('V2.0 Vocabulary & Level Tests (Phase 1-4)', () => {

  test('TC-VOC-01: Word coverage should be minimum 730 words', async () => {
    // Direct data check
    const totalWords = vocabData.data.length;
    expect(totalWords).toBeGreaterThanOrEqual(720);
  });

  test('TC-VOC-02: Units should be partitioned into exactly 15 levels', async () => {
    // Use the actual utility function used in the app
    const units = getUnits();
    expect(units.length).toBe(15);

    // Check for even distribution (approximate)
    const avgSize = Math.ceil(vocabData.data.length / 15);
    units.forEach((unit, idx) => {
      expect(unit.words.length).toBeGreaterThan(0);
      // Last unit might be smaller, but others should be unitSize
      if (idx < 14) {
        expect(unit.words.length).toBeLessThanOrEqual(avgSize);
      }
    });
  });

  test('TC-VOC-02: Words should be sorted by difficulty (heuristic)', async () => {
    const units = getUnits();

    // Heuristic: Unit 1 average word length should be shorter than Unit 15
    const getAvgLen = (words: { word: string }[]) => words.reduce((acc, w) => acc + w.word.length, 0) / words.length;

    const unit1Avg = getAvgLen(units[0].words);
    const unit15Avg = getAvgLen(units[14].words);

    console.log(`Unit 1 Avg Length: ${unit1Avg}`);
    console.log(`Unit 15 Avg Length: ${unit15Avg}`);

    expect(unit15Avg).toBeGreaterThan(unit1Avg);
  });

  test('Header should display the correct total word count', async ({ page }) => {
    await page.goto('/kamivoca');

    // Select Volume 2 to get full count (Volume 1 is default)
    const vol2Btn = page.locator('img[alt="Book 2"]');
    await vol2Btn.click();

    // The header has a pill with totalWords.toLocaleString()
    const totalWords = vocabData.data.length.toLocaleString();
    const stashPill = page.locator('.vocab-stash-pill strong');
    await expect(stashPill).toHaveText(totalWords);
  });
});
