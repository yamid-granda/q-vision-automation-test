import { test, expect } from '@playwright/test';

const OUTLET_URL = 'https://www.bon-bonite.com/categoria-producto/outlet/';
const PRODUCT_URL = 'https://www.bon-bonite.com/producto/baleta-en-cuero-con-glitter-color-negro-onix/';
const PRODUCT_NAME = 'Baleta en cuero con glitter color negro ónix';
// Original price struck through next to the outlet price.
const OFFER = '$279,900 $195,930';

test('open the first outlet product and check its offer', async ({ page }) => {
  // GIVEN the outlet category and the cookie banner dismissed
  await page.goto(OUTLET_URL);
  await page.locator('#cookiescript_reject').click();
  await expect(page.locator('#cookiescript_injected_wrapper')).toBeHidden();

  // AND its first product is the glitter baleta
  const firstCard = page.locator('div.group').filter({ has: page.locator('.product-title') }).first();
  await expect(firstCard.locator('.product-title')).toHaveText(PRODUCT_NAME);

  // WHEN the product is opened
  await firstCard.locator('a[href*="/producto/"]').first().click();

  // THEN its page is shown
  await expect(page).toHaveURL(PRODUCT_URL);

  // AND it shows the outlet offer
  await expect(page.locator('.price')).toHaveText(OFFER);
});
