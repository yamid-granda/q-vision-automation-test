import type { Locator, Page } from '@playwright/test';

/**
 * Finds an element by its `name` attribute inside a scope.
 *
 * This site renders every form field as a named input, so `name` is the most
 * stable selector available. Wrapping it keeps specs readable and makes a
 * single place to change if the markup ever moves to something like
 * `data-name`.
 *
 * @param scope Element to search within (usually a form locator).
 * @param name Value of the `name` attribute to match.
 */
export function getByName(scope: Locator | Page, name: string): Locator {
  // Escape double quotes and backslashes so odd names cannot break out of the
  // attribute selector.
  const escaped = name.replace(/(["\\])/g, '\\$1');
  return scope.locator(`[name="${escaped}"]`);
}