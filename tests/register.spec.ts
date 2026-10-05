import { test, expect } from '@playwright/test';

import { getByName } from './utils/get-by-name';

const REGISTER_FORM = 'form#form-register';

test('register a new account', async ({ page }) => {
  await page.goto('https://www.bon-bonite.com/mi-cuenta/');

  // The page opens on the login view; the register form is hidden until toggled.
  await page.locator('#show_register').click();

  const form = page.locator(REGISTER_FORM);

  // Required inputs must be marked as such.
  for (const name of [
    'username',
    'first_name',
    'last_name',
    'email',
    'password',
    'password2',
  ]) {
    await expect(getByName(form, name)).toHaveAttribute('required', '');
  }

  // `username` is the Cédula field: it only accepts digits.
  const suffix = Date.now().toString().slice(-9);
  const email = `e2e-${suffix}@example.com`;

  await getByName(form, 'username').fill(`1${suffix}`);
  await getByName(form, 'first_name').fill('E2E');
  await getByName(form, 'last_name').fill('Test');
  await getByName(form, 'email').fill(email);
  await getByName(form, 'password').fill('E2e-Password-123');
  await getByName(form, 'password2').fill('E2e-Password-123');
  await getByName(form, 'privacy_policy_reg').check();

  await getByName(form, 'register').click();

  // On success the site redirects to the account dashboard greeting the user.
  await expect(page.getByRole('heading', { name: /hola, e2e/i })).toBeVisible();
});