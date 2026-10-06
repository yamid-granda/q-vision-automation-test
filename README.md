# Q-Vision Automation Test

Yamid Granda proposal for automation test vacancy

## Requirements</path>

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
pnpm test tests/outlet-product-offer.spec.ts
```

Output on success:

```
Running 1 test using 1 worker

[1/1] [chromium] › tests/outlet-product-offer.spec.ts:9:5 › open the first outlet product and check its offer
  1 passed (4.5s)
```

## Environment variables

| Variable | Effect | Default |
| --- | --- | --- |
| `E2E_PLACE_ORDER` | `true` places the real order in the purchase test (writes to the store) | off — stops at "Registrar Orden" |
| `E2E_PRODUCT_URL` | Product the purchase test buys | `.../producto/baleta-en-cuero-borgona/` |
| `E2E_PRODUCT_NAME` | Name asserted on the page and on the receipt | `Baleta en cuero borgoña` |
| `E2E_PROXY_SERVER` | Browser-level proxy (see below) | off |
| `E2E_PROXY_USERNAME`, `E2E_PROXY_PASSWORD` | Proxy credentials | — |
| `E2E_PROXY_BYPASS` | Hosts that skip the proxy | `localhost,127.0.0.1` |

Run the purchase test against a product that is in stock:

```bash
E2E_PRODUCT_URL=https://www.bon-bonite.com/producto/baleta-con-cordon-en-cuero-esmeralda/ \
E2E_PRODUCT_NAME='Baleta en terciopelo verde esmeralda' \
  pnpm test tests/purchase-happy-path.spec.ts
```

## The site returns 403 — run through a VPN / proxy

`www.bon-bonite.com` sits behind an AWS load balancer (`server: awselb/2.0`) that
answers **403 Forbidden** for some client IPs. The block is at the network layer:
`curl` and the browser get the same 403, so it is not a bot check on the browser
and no test change can fix it. Route the traffic from a different exit IP.

### Browser-level proxy (Playwright)

`playwright.config.ts` passes `proxy` to the browser, so **only the test browser**
uses it — the rest of the machine is untouched.

| Variable | Required | Example |
| --- | --- | --- |
| `E2E_PROXY_SERVER` | yes | `socks5://127.0.0.1:1080` or `http://10.0.0.5:3128` |
| `E2E_PROXY_USERNAME` | no | `usr` (HTTP proxy with auth) |
| `E2E_PROXY_PASSWORD` | no | `pwd` |
| `E2E_PROXY_BYPASS` | no | defaults to `localhost,127.0.0.1` |

```bash
E2E_PROXY_SERVER=socks5://127.0.0.1:1080 pnpm test
```

### Free VPN providers

**1. Cloudflare WARP** — free, unlimited traffic, no sign-up. Fastest way to get
a different exit IP. Tunnels the whole machine, so no proxy variable is needed.

```bash
brew install --cask cloudflare-warp
warp-cli registration new
warp-cli connect
pnpm test
```

Caveat: the exit is the nearest Cloudflare datacenter and cannot be changed to a
specific country on the free plan.

**2. Proton VPN (free plan)** — free account with an email, unlimited traffic, no
ads, servers in US / NL / JP / PL / RO. Also a system tunnel (same as WARP).

```bash
brew install --cask protonvpn   # or the .dmg from protonvpn.com/download
```

**3. Free VPS + SSH SOCKS** — the pure *browser-level* route: no VPN client at
all, only Playwright traffic leaves through the tunnel. Oracle Cloud *Always
Free* instances are free forever (sign-up wants a card, nothing is charged).

```bash
ssh -D 1080 -C -N user@<vps>          # local SOCKS5 on 127.0.0.1:1080
E2E_PROXY_SERVER=socks5://127.0.0.1:1080 pnpm test
```

> If a free exit IP is also refused, the WAF is likely filtering by IP
> reputation rather than geography. Ask the site team to allowlist the runner IP
> — that is the durable fix.

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
│   ├── outlet-product-offer.spec.ts
│   ├── purchase-happy-path.spec.ts
│   ├── register-and-update-personal-info.spec.ts
│   └── utils/
└── .gitignore
```

## Commit messages

Commit messages are linted with [**commitlint**](https://commitlint.js.org/) and must follow [**Conventional Commits**](https://www.conventionalcommits.org/en/v1.0.0/). The check is mandatory — it runs on every commit via a husky hook and again in CI.

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
pnpm run test tests/register-and-update-personal-info.spec.ts
```

Run only that file with a visible browser:

```bash
pnpm run test:headed tests/register-and-update-personal-info.spec.ts
```

## Pending to Study

Patterns
page object model
screen play