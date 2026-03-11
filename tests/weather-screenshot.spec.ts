import { test, expect } from '@playwright/test';

test.use({
  geolocation: { longitude: 126.9780, latitude: 37.5665 },
  permissions: ['geolocation'],
});

test('capture weather effect on mobile', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the canvas to be rendered
  const canvas = page.locator('#weather-background');
  await expect(canvas).toBeAttached({ timeout: 10000 });
  
  // Wait for the weather API to fetch and render the effect
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: '/Users/ikyoon/.gemini/antigravity/brain/3dda8b3c-d21c-470f-ab30-dfd1d60e05e2/weather_s25.png', fullPage: true });
});
