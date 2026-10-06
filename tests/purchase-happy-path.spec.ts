import { test, expect, type Locator } from '@playwright/test';

// Defaults to the baleta; override with E2E_PRODUCT_URL / E2E_PRODUCT_NAME when
// that product is out of stock (it is a live store).
const PRODUCT_URL =
  process.env.E2E_PRODUCT_URL ?? 'https://www.bon-bonite.com/producto/baleta-en-cuero-borgona/';
const PRODUCT_NAME = process.env.E2E_PRODUCT_NAME ?? 'Baleta en cuero borgoña';

// Placing the order is the only write (creates an order, decrements stock), so it is opt-in.
const PLACE_ORDER = process.env.E2E_PLACE_ORDER === 'true';

// "$ 262,900" -> "262900": a formatting change must not break the price checks.
const amount = (text: string | null) => (text ?? '').replace(/\D/g, '');
const amountOf = async (loc: Locator) => amount(await loc.textContent());

// Throwaway session: anonymous no matter what the project `storageState` sets.
test.use({ storageState: { cookies: [], origins: [] } });

test('purchase a product as a guest', async ({ page, context }) => {
  test.setTimeout(180_000); // the full checkout takes ~50s against the live site

  // GIVEN a clean, anonymous session
  expect(await context.cookies()).toHaveLength(0);

  // AND the cookie banner is dismissed so it never covers a control
  await page.goto(PRODUCT_URL);
  await page.locator('#cookiescript_reject').click();
  await expect(page.locator('#cookiescript_injected_wrapper')).toBeHidden();

  // AND the product page is shown
  await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();

  // AND its price is read
  const price = amount(await page.locator('p.price').textContent());
  expect(price).toMatch(/^\d+$/);

  // WHEN an in-stock size is chosen (read `data-product_variations`, don't probe clicks)
  const size = await page.evaluate(() => {
    const el = document.querySelector('[data-product_variations]');
    const variations = JSON.parse(el?.getAttribute('data-product_variations') ?? '[]') as {
      attributes: Record<string, string>;
      is_in_stock: boolean;
    }[];
    return variations.find((v) => v.is_in_stock)?.attributes.attribute_pa_talla ?? '';
  });

  // THEN a buyable size was found
  expect(size, 'no size is in stock').toBeTruthy();

  await page.locator(`.variation-button[data-value="${size}"]`).click();
  await expect(page.locator('.woocommerce-variation-add-to-cart')).toHaveClass(/-enabled/);

  // WHEN it is added to the cart (centred: the fixed header covers the top)
  const addToCart = page.locator('.single_add_to_cart_button');
  await addToCart.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await addToCart.click();

  // THEN the header cart shows one item
  await expect(page.locator('.cart-contents-count:visible').first()).toHaveText('1');

  // WHEN the header cart is opened and "Ver carrito" is followed
  await page.locator('a.cart-contents:visible').first().hover();
  await page.getByRole('link', { name: 'Ver carrito' }).click();
  await expect(page).toHaveURL(/\/carrito\/?(\?|$)/);

  // THEN the cart holds one unit at the product price
  const cartItem = page.locator('.woocommerce-cart-form .cart_item');
  await expect(cartItem).toHaveCount(1);
  await expect(cartItem).toContainText(`${PRODUCT_NAME} - ${size}`);
  await expect(cartItem.locator('input.qty:visible')).toHaveValue('1');
  expect(await amountOf(cartItem.locator('td.product-price'))).toBe(price);
  expect(await amountOf(cartItem.locator('td.product-subtotal'))).toBe(price);

  // AND the subtotal matches
  expect(await amountOf(page.locator('.cart-subtotal .amount'))).toBe(price);

  // WHEN checkout is started
  await page.getByRole('link', { name: 'Finalizar compra' }).click();
  await expect(page).toHaveURL(/\/finalizar-compra\/?(\?|$)/);

  // THEN the review shows the same quantity and prices
  const review = page.locator('.woocommerce-checkout-review-order-table');
  await expect(review.locator('.cart_item')).toHaveCount(1);
  await expect(review.locator('.cart_item')).toContainText(`${PRODUCT_NAME} - ${size}`);
  expect(await amountOf(review.locator('.product-quantity'))).toBe('1');
  expect(await amountOf(review.locator('.cart_item .product-total'))).toBe(price);

  // AND the total matches (read `<strong>`: the row repeats it in an IVA note)
  const reviewTotals = review.locator('.order-review-footer');
  expect(await amountOf(reviewTotals.locator('.totals-row .amount').first())).toBe(price);
  expect(await amountOf(reviewTotals.locator('.order-total strong .amount'))).toBe(price);

  // WHEN the step is confirmed
  await page.getByRole('button', { name: 'Continuar' }).click();

  // THEN checkout continues as a guest
  await page.locator('.guest-cta:visible').click();

  // AND the required invoice fields are marked
  const billing = page.locator('.woocommerce-billing-fields');
  const requiredField = (name: string) => billing.locator(`#${name}`);
  for (const name of [
    'billing_tipo_documento',
    'billing_user_login',
    'billing_first_name',
    'billing_last_name',
    'billing_gender',
    'billing_email',
    'billing_phone',
    'billing_country',
    'billing_state',
    'billing_city',
    'billing_address_1',
  ]) {
    await expect(requiredField(name)).toHaveAttribute('aria-required', 'true');
  }

  // AND the terms checkbox is marked mandatory
  const terms = page.locator('#terms');
  await expect(terms.locator('xpath=following-sibling::span')).toContainText('*');

  // WHEN the required invoice fields are filled (a known DNI opens a login modal)
  const suffix = Date.now().toString().slice(-9);
  await requiredField('billing_tipo_documento').selectOption('CC');
  await requiredField('billing_user_login').fill(suffix);
  await requiredField('billing_first_name').fill('E2E');
  await requiredField('billing_last_name').fill('Comprador');
  await requiredField('billing_gender').selectOption({ index: 1 });
  await requiredField('billing_email').fill(`e2e-${suffix}@example.com`);
  await requiredField('billing_phone').fill('3001234567');
  await requiredField('billing_country').selectOption('CO');

  // AND country/state/city are picked in order (each select enables the next)
  await requiredField('billing_state').selectOption({ index: 1 });
  await requiredField('billing_city').selectOption({ index: 1 });
  await requiredField('billing_address_1').fill('Calle 1 # 2-3');

  // THEN the order table still shows the same quantity and prices
  expect(await amountOf(review.locator('.product-quantity'))).toBe('1');
  expect(await amountOf(review.locator('.cart_item .product-total'))).toBe(price);
  expect(await amountOf(review.locator('.order-total strong .amount'))).toBe(price);

  // AND the terms are accepted
  await terms.check();

  // AND the payment method is set (single "cheque" gateway, no redirect to mock)
  await expect(page.locator('.wc_payment_method')).toHaveCount(1);
  await expect(page.locator('#payment_method_cheque')).toBeChecked();

  // THEN the order can be placed
  await expect(page.locator('#place_order')).toBeEnabled();

  if (!PLACE_ORDER) {
    // AND the run stops here, so no order is created and no stock is used
    test.info().annotations.push({
      type: 'note',
      description: 'Set E2E_PLACE_ORDER=true to also place the order and check the receipt.',
    });
    return;
  }

  // WHEN the order is placed
  await page.locator('#place_order').click();

  // THEN the order is received
  await page.waitForURL(/\/order-received\/\d+\//, { timeout: 90_000 });
  const received = page.locator('.woocommerce-order-received');
  await expect(received).toContainText('Gracias por tu pedido');
  await expect(received).toContainText('Tu orden se registró con éxito');
  await expect(received).toContainText('Orden número');

  // AND the receipt lists the product, size and price
  const receipt = page.locator('.woocommerce-order-details');
  await expect(receipt).toContainText(`${PRODUCT_NAME} - ${size}`);
  expect(await amountOf(receipt.locator('.amount').first())).toBe(price);

  // AND the receipt totals match the cart
  const summary = (await receipt.textContent()) ?? '';
  expect(amount(summary.match(/Subtotal:?\s*\$?\s*([\d.,]+)/)?.[1] ?? '')).toBe(price);
  expect(amount(summary.match(/Total:?\s*\$?\s*([\d.,]+)/)?.[1] ?? '')).toBe(price);
});
