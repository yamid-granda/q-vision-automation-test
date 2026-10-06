import type { Page } from '@playwright/test';

const AJAX_ENDPOINT = '/wp-admin/admin-ajax.php';

/**
 * Waits for a WordPress AJAX action to complete.
 *
 * Pass the returned promise to `Promise.all` alongside the interaction that
 * triggers it, otherwise the request may still be in flight when the next step
 * navigates away and aborts it.
 *
 * @param action Value of the `action` form field, e.g.
 *   `update_custom_profile_fields`.
 */
export function waitForAjaxAction(page: Page, action: string) {
  return page.waitForResponse((res) => {
    if (!res.url().includes(AJAX_ENDPOINT)) return false;

    const body = new URLSearchParams(res.request().postData() ?? '');
    return body.get('action') === action;
  });
}