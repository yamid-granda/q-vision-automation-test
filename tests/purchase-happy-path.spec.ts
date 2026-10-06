import { test, expect } from '@playwright/test';

const PRODUCT_URL = 'https://www.bon-bonite.com/producto/baleta-en-cuero-borgona/';
const PRODUCT_NAME = 'Baleta en cuero borgoña';

// Keep the numbers only: "$ 262,900" -> "262900", so a formatting change in
// the site does not break the price checks.
function amount(text: string | null): string {
  return (text ?? '').replace(/\D/g, '');
}

// Always start from an empty, throwaway session: no saved storage, so the
// visitor is anonymous no matter what the project config does with
// `storageState`, and nothing leaks between runs.
test.use({ storageState: { cookies: [], origins: [] } });

test('purchase a product as a guest', async ({ page, context }) => {
  test.setTimeout(180_000); // the full checkout takes ~50s against the live site

  // GIVEN the session is clean
  expect(await context.cookies()).toHaveLength(0);

  // AND cookies are rejected, so the banner never covers a control later
  await page.goto(PRODUCT_URL);
  await page.locator('#cookiescript_reject').click();
  await expect(page.locator('#cookiescript_injected_wrapper')).toBeHidden();

  // AND the product page for a baleta is shown
  await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();

  // AND its price is shown
  const price = amount(await page.locator('p.price').textContent());
  expect(price).toMatch(/^\d+$/);

  // WHEN an in-stock size is chosen
  // The page ships the authoritative per-size stock flag in
  // `data-product_variations`, so read it rather than probing each size by
  // clicking and dismissing the out-of-stock modal.
  // const size = await page.evaluate(() => {
  //   const raw =
  //     document
  //       .querySelector('[data-product_variations]')
  //       ?.getAttribute('data-product_variations') ?? '[]';

  //   const variations = JSON.parse(raw) as {
  //     attributes: Record<string, string>;
  //     is_in_stock: boolean;
  //   }[];

  //   return variations.find((v) => v.is_in_stock)?.attributes.attribute_pa_talla ?? '';
  // });
  const size = 39

  // THEN a size that can actually be bought was found
  expect(size, 'no size is in stock').toBeTruthy();

  await page.locator(`.variation-button[data-value="${size}"]`).click();
  await expect(page.locator('.woocommerce-variation-add-to-cart')).toHaveClass(/-enabled/);

  // WHEN it is added to the cart
  // (centred explicitly: the fixed header sits over anything scrolled to the top)
  const addToCart = page.locator('.single_add_to_cart_button');
  await addToCart.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await addToCart.click();

  // THEN the header cart reports one item
  await expect(page.locator('.cart-contents-count:visible').first()).toHaveText('1');

  // WHEN the cart in the header is opened and "Ver carrito" is followed
  await page.locator('a.cart-contents:visible').first().hover();
  await page.getByRole('link', { name: 'Ver carrito' }).click();
  await expect(page).toHaveURL(/\/carrito\/?(\?|$)/);

  // THEN the cart holds one unit of the baleta at the product price
  const cartItem = page.locator('.woocommerce-cart-form .cart_item');
  await expect(cartItem).toHaveCount(1);
  await expect(cartItem).toContainText(`${PRODUCT_NAME} - ${size}`);
  await expect(cartItem.locator('input.qty:visible')).toHaveValue('1');
  expect(amount(await cartItem.locator('td.product-price').textContent())).toBe(price);
  expect(amount(await cartItem.locator('td.product-subtotal').textContent())).toBe(price);

  // AND the cart subtotal matches
  expect(amount(await page.locator('.cart-subtotal .amount').textContent())).toBe(price);

  // WHEN checkout is started
  await page.getByRole('link', { name: 'Finalizar compra' }).click();
  await expect(page).toHaveURL(/\/finalizar-compra\/?(\?|$)/);

  // THEN the order review shows the same quantity, subtotal and total
  const review = page.locator('.woocommerce-checkout-review-order-table');
  await expect(review.locator('.cart_item')).toHaveCount(1);
  await expect(review.locator('.cart_item')).toContainText(`${PRODUCT_NAME} - ${size}`);
  expect(amount(await review.locator('.product-quantity').textContent())).toBe('1');
  expect(amount(await review.locator('.cart_item .product-total').textContent())).toBe(price);

  // The total row repeats the amount in an IVA note, so read the `<strong>`.
  const reviewTotals = review.locator('.order-review-footer');
  expect(amount(await reviewTotals.locator('.totals-row .amount').first().textContent())).toBe(
    price,
  );
  expect(
    amount(await reviewTotals.locator('.order-total strong .amount').textContent()),
  ).toBe(price);

  // WHEN the step is confirmed
  await page.getByRole('button', { name: 'Continuar' }).click();

  // THEN checkout can continue as a guest
  await page.locator('.guest-cta:visible').click();

  // AND the invoice details mark the required fields
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

  // AND the terms checkbox is marked mandatory by an asterisk in its label
  const terms = page.locator('#terms');
  await expect(terms.locator('xpath=following-sibling::span')).toContainText('*');

  // WHEN only the required invoice fields are filled (the DNI has to be
  // unique: a known one opens a login modal instead of the order form)
  const suffix = Date.now().toString().slice(-9);

  await requiredField('billing_tipo_documento').selectOption('CC');
  await requiredField('billing_user_login').fill(suffix);
  await requiredField('billing_first_name').fill('E2E');
  await requiredField('billing_last_name').fill('Comprador');
  await requiredField('billing_gender').selectOption({ index: 1 });
  await requiredField('billing_email').fill(`e2e-${suffix}@example.com`);
  await requiredField('billing_phone').fill('3001234567');
  await requiredField('billing_country').selectOption('CO');

  // Country, state and city cascade: each select is disabled until the one
// above it is chosen, so the order here is required.
  await requiredField('billing_state').selectOption({ index: 1 });
  await requiredField('billing_city').selectOption({ index: 1 });
  await requiredField('billing_address_1').fill('Calle 1 # 2-3');

  // THEN "your order" still shows the same quantity and prices
  const yourOrder = page.locator('.woocommerce-checkout-review-order-table');
  expect(amount(await yourOrder.locator('.product-quantity').textContent())).toBe('1');
  expect(amount(await yourOrder.locator('.cart_item .product-total').textContent())).toBe(price);
  expect(
    amount(await yourOrder.locator('.order-total strong .amount').textContent()),
  ).toBe(price);

  // AND the mandatory terms are accepted
  await terms.check();

  // AND the payment method is selected
  // (the site exposes a single gateway, "cheque": the team contacts the buyer
  // to settle shipping and payment, so there is no redirect to mock)
  const payment = page.locator('.wc_payment_method');
  await expect(payment).toHaveCount(1);
  await expect(page.locator('#payment_method_cheque')).toBeChecked();

  // WHEN the order is placed
  await page.locator('#place_order').click();

  // THEN the order is received
  await page.waitForURL(/\/order-received\/\d+\//, { timeout: 90_000 });

  const received = page.locator('.woocommerce-order-received');
  await expect(received).toContainText('Gracias por tu pedido');
  await expect(received).toContainText('Tu orden se registró con éxito');
  await expect(received).toContainText('Orden número');

  // AND the receipt lists the baleta, size and price
  const receipt = page.locator('.woocommerce-order-details');
  await expect(receipt).toContainText(`${PRODUCT_NAME} - ${size}`);
  expect(amount(await receipt.locator('.amount').first().textContent())).toBe(price);

  // AND the receipt totals match the cart
  const summary = (await receipt.textContent()) ?? '';
  const subtotal = summary.match(/Subtotal:?\s*\$?\s*([\d.,]+)/)?.[1];
  const total = summary.match(/Total:?\s*\$?\s*([\d.,]+)/)?.[1];

  expect(amount(subtotal ?? '')).toBe(price);
  expect(amount(total ?? '')).toBe(price);
});