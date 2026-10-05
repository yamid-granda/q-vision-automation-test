# E2E Tests

End-to-end testing scaffold with **Playwright** + **TypeScript**.

## Requirements

- Node.js 18 or higher
- pnpm

## Install

```bash
pnpm install
pnpm exec playwright install chromium
```

If you don't have pnpm:

```bash
npm install -g pnpm
```

## Run the tests

```bash
pnpm test
```

Output on success:

```
Running 1 test using 1 worker

[1/1] [chromium] › tests/home.spec.ts:3:5 › home page loads
  1 passed (5.8s)
```

## Other commands

| Command | Description |
| --- | --- |
| `pnpm test` | Run all tests |
| `pnpm run test:headed` | Run tests with a visible browser |
| `pnpm run test:ui` | Playwright UI mode (debug / step through) |
| `pnpm run test:report` | Open the HTML report of the last run |
| `pnpm run typecheck` | Check types without emitting files |

## Project structure

```
.
├── package.json          # scripts and dependencies
├── pnpm-lock.yaml        # lockfile
├── tsconfig.json         # TypeScript config
├── playwright.config.ts  # Playwright config
├── tests/
│   └── home.spec.ts      # tests
└── .gitignore
```

## Adding a new test

Create a file inside `tests/` and follow the `*.spec.ts` naming:

```ts
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('h1')).toBeVisible();
});
```

Run only that file:

```bash
pnpm exec playwright test tests/my-new-test.spec.ts
```
