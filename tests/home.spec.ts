import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('https://www.bon-bonite.com/');

  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('body')).toBeVisible();
});
