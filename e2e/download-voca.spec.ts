import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('should download vocabulary JSON when clicking the total word count pill', async ({ page }) => {
  // 1. Navigate to the local dev server (basePath = /kamivoca)
  await page.goto('/kamivoca/', { waitUntil: 'domcontentloaded' });

  // 2. Wait for the Download JSON button to appear (Firebase auth may take a moment)
  await page.waitForSelector('[title="Download JSON"]', { timeout: 20000 });

  // 3. Remove showSaveFilePicker so headless Chromium uses the blob URL fallback
  //    (Headless Chrome doesn't support File System Access API)
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).showSaveFilePicker;
  });

  // 4. Set up download listener BEFORE clicking
  const downloadPromise = page.waitForEvent('download');

  // 5. Click the word count pill (title="Download JSON")
  await page.getByTitle("Download JSON").click();

  const download = await downloadPromise;

  // 5. Verify filename matches YYYY-MM-DD-voca.json
  const today = new Date().toISOString().split('T')[0];
  const expectedFilename = `${today}-voca.json`;
  expect(download.suggestedFilename()).toBe(expectedFilename);

  // 6. Save and validate JSON content
  const downloadPath = path.join(__dirname, '..', 'test-results', download.suggestedFilename());
  fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
  await download.saveAs(downloadPath);

  const content = fs.readFileSync(downloadPath, 'utf-8');
  const data = JSON.parse(content);

  // 7. Validate it is a non-empty array with 730 entries
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(721);

  // 8. Validate structure of first entry
  const firstEntry = data[0];
  expect(firstEntry).toHaveProperty('스페인어 단어');
  expect(firstEntry).toHaveProperty('한국어 의미');

  console.log(`✅ Downloaded ${data.length} words → ${expectedFilename} `);
});
