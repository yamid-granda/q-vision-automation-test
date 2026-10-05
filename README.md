# E2E Tests

End-to-end testing scaffold with **Playwright** + **TypeScript**.

Commit messages are linted with [**commitlint**](https://commitlint.js.org/) and must follow [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/). The check is mandatory — it runs on every commit via a husky hook and again in CI.

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
| `pnpm run commitlint` | Lint a commit message (interactive) |
| `pnpm run lint:commit` | Lint the last commit |
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
├── commitlint.config.mjs # commit message rules
├── .husky/
│   └── commit-msg        # enforces commitlint on commit
├── .github/
│   └── workflows/
│       └── ci.yml        # typecheck + tests + commitlint
├── tests/
│   └── home.spec.ts      # tests
└── .gitignore
```

## Commit messages

Format:

```
<type>(<optional scope>): <subject>
```

Examples:

```
feat: add home page load test
fix(tests): wait for banner before asserting
chore: bump playwright to 1.63.0
```

Allowed types:

| Type | Use for |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting only (no code change) |
| `refactor` | Code change that is neither fix nor feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Other maintenance |
| `revert` | Reverts a previous commit |

### How the check runs

1. **On commit (local)** — husky's `commit-msg` hook runs commitlint. A non-conforming message aborts the commit:

```
add stuff
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
✖   found 2 problems, 0 warnings
husky - commit-msg script failed (code 1)
```

2. **On push / PR (CI)** — `.github/workflows/ci.yml` lints every commit in the push range.

### Useful commands

```bash
# lint the message you are writing (interactive)
pnpm run commitlint

# lint the last commit
pnpm run lint:commit

# lint a commit range
pnpm exec commitlint --from HEAD~3 --to HEAD
```

Bypass locally (not recommended):

```bash
git commit -m "add stuff" --no-verify
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
