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

  // The account menu renders the "edit-account" link three times (desktop
  // dropdown, mobile dropdown and the tab bar); only the tab bar one is visible.
  await page.locator('a[href$="edit-account/"]:visible').click();

  await expect(page).toHaveURL(/\/mi-cuenta\/edit-account\//);

  // "Datos Personales" shows values as static text until edit mode is turned on.
  const profileForm = page.locator('#profile-update-form');
  await expect(profileForm.locator('[data-field="first_name"]')).toHaveText('E2E');

  // The toggle is wired up by a deferred theme script, so a click can land
  // before the handler is bound. Retry until the section flips to inputs.
  const firstNameInput = getByName(profileForm, 'first_name');
  await expect(async () => {
    await profileForm.locator('.update-info-btn:visible').click();
    await expect(firstNameInput).toBeEditable();
  }).toPass();

  await firstNameInput.fill('E2E Updated');
  await getByName(profileForm, 'last_name').fill('Test Updated');

  await profileForm.locator('.save-info-btn:visible').click();

  await expect(page.locator('#profile-message')).toContainText(
    'Datos personales actualizados correctamente',
  );
});
