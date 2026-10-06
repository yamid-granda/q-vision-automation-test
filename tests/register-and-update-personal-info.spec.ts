import { test, expect } from '@playwright/test';

import { getByName } from './utils/get-by-name';

const REGISTER_FORM = '#form-register';
const REQUIRED_FIELDS = [
  'username',
  'first_name',
  'last_name',
  'email',
  'password',
  'password2',
];

test('register a new account', async ({ page }) => {
  // GIVEN the register form
  await page.goto('https://www.bon-bonite.com/mi-cuenta/');
  await page.locator('#show_register').click();

  const form = page.locator(REGISTER_FORM);

  // AND it requires every account field
  for (const name of REQUIRED_FIELDS) {
    await expect(getByName(form, name)).toHaveAttribute('required', '');
  }

  // AND it is filled with valid data (`username` is the Cédula: digits only)
  const suffix = Date.now().toString().slice(-9);
  const email = `e2e-${suffix}@example.com`;

  await getByName(form, 'username').fill(`1${suffix}`);
  await getByName(form, 'first_name').fill('E2E');
  await getByName(form, 'last_name').fill('Test');
  await getByName(form, 'email').fill(email);
  await getByName(form, 'password').fill('E2e-Password-123');
  await getByName(form, 'password2').fill('E2e-Password-123');
  await getByName(form, 'privacy_policy_reg').check();

  // WHEN the form is submitted
  await getByName(form, 'register').click();

  // THEN the dashboard greets the new user
  await expect(page.getByRole('heading', { name: /hola, e2e/i })).toBeVisible();

  // WHEN "Datos" is followed (two other copies sit in hidden dropdowns)
  await page.locator('a[href$="edit-account/"]:visible').click();

  // THEN the account data is shown read-only
  await expect(page).toHaveURL(/\/mi-cuenta\/edit-account\//);

  const profileForm = page.locator('#profile-update-form');
  await expect(profileForm.locator('[data-field="first_name"]')).toHaveText('E2E');

  // WHEN edit mode is turned on (retry: the click can outrun the JS handler)
  const firstNameInput = getByName(profileForm, 'first_name');
  await expect(async () => {
    await profileForm.locator('.update-info-btn:visible').click();
    await expect(firstNameInput).toBeEditable();
  }).toPass();

  // AND the data is changed and saved
  await firstNameInput.fill('E2E Updated');
  await getByName(profileForm, 'last_name').fill('Test Updated');
  await profileForm.locator('.save-info-btn:visible').click();

  // THEN the update is confirmed
  await expect(page.locator('#profile-message')).toContainText(
    'Datos personales actualizados correctamente',
  );
});
