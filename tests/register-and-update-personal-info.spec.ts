import { test, expect } from '@playwright/test';

import { getByName } from './utils/get-by-name';

const REGISTER_FORM = '#form-register';
// Single-word: the header renders only the first word of the first name.
const UPDATED_FIRST_NAME = 'E2EUpdated';
const UPDATED_LAST_NAME = 'TestUpdated';
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

  // AND the data is changed and saved (wait for the response: the reload below
  // would otherwise abort the request)
  await firstNameInput.fill(UPDATED_FIRST_NAME);
  await getByName(profileForm, 'last_name').fill(UPDATED_LAST_NAME);
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('admin-ajax.php') &&
        (res.request().postData() ?? '').includes('action=update_custom_profile_fields'),
    ),
    profileForm.locator('.save-info-btn:visible').click(),
  ]);

  // THEN the update is confirmed
  await expect(page.locator('#profile-message')).toContainText(
    'Datos personales actualizados correctamente',
  );

  // WHEN the page is reloaded
  await page.reload();

  // THEN the hero greets the user with the new name
  await expect(
    page.getByRole('heading', { name: `Hola, ${UPDATED_FIRST_NAME}.` }),
  ).toBeVisible();

  // AND the account menu reveals the new name on hover
  await page.locator('#user-icon-wrap').hover();

  const accountMenu = page.locator('#header-account-menu');
  await expect(accountMenu).toBeVisible();
  await expect(accountMenu).toContainText(UPDATED_FIRST_NAME);

  // AND the personal data section still shows both new values
  await expect(profileForm.locator('[data-field="first_name"]')).toHaveText(UPDATED_FIRST_NAME);
  await expect(profileForm.locator('[data-field="last_name"]')).toHaveText(UPDATED_LAST_NAME);
});
