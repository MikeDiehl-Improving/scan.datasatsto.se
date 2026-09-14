# Treegress and Scan Project Recap

**Period covered:** September 12–14, 2026  
**Repositories:** [`treegress-agents-local`](../Treegress/treegress-agents-local) and [`scan.datasatsto.se`](.)

## Starting context

The work started with **Copilot in VS Code on a Windows computer**, working
from the local repositories and their existing Treegress configuration.

[`scan.datasatsto.se`](https://github.com/MikeDiehl-Improving/scan.datasatsto.se)
is a public community GitHub fork. Its configured Git origin is
`https://github.com/MikeDiehl-Improving/scan.datasatsto.se`, and GitHub
identifies the upstream parent repository as
[`strdco/scan.datasatsto.se`](https://github.com/strdco/scan.datasatsto.se).

## Scope

This recap uses local Git history and the Treegress artifacts recorded in
[`.treegress/`](.treegress). The substantive work began on September 13; no
substantive Treegress or scan feature commits were found for September 12.

## Changes in `treegress-agents-local`

The local Treegress checkout is
[`treegress-agents-local`](../Treegress/treegress-agents-local).

### September 13: onboarding and cross-platform support

The local package was updated to make onboarding and use more reliable across
Windows and Unix-like environments:

- Added cross-platform package configuration and `.gitattributes`.
- Added the skill-definition copy/build flow in
  [`scripts/copy-skill-definitions.ts`](../Treegress/treegress-agents-local/scripts/copy-skill-definitions.ts).
- Added the MCP onboarding guide in
  [`setup-instructions/setup.md`](../Treegress/treegress-agents-local/setup-instructions/setup.md).
- Added skill usage guidance in
  [`docs/SKILL_USAGE.md`](../Treegress/treegress-agents-local/docs/SKILL_USAGE.md).
- Added publishing and package-readme support.
- Updated package scripts for cross-platform consistency.
- Adjusted ESLint configuration for the new `.mjs` scripts.
- Documented usage for both Copilot and Claude workflows.

Notable commits:

- `7a6534f` — cross-platform compatibility
- `5e9baf4` and `81a3f63` — postbuild, onboarding, and setup documentation
- `86880ca` — package-script consistency
- `0d0b6d4` — enhanced onboarding and Treegress MCP setup scripts
- `bd96579` — ESLint handling for new scripts
- `e49ea97` — Copilot and Claude skill-usage updates

### September 14: Capability Map grounding

You incorporated the mandatory Capability Map grounding work:

- Updated [`src/mcp/tools.ts`](../Treegress/treegress-agents-local/src/mcp/tools.ts).
- Updated the workflow specification in
  [`SPEC.md`](../Treegress/treegress-agents-local/SPEC.md).
- Updated MCP and integration tests, including:
  - `tests/mcp/capability-map-hints.test.ts`
  - `tests/mcp/happy-path.test.ts`
  - `tests/integration/dogfood.test.ts`
  - related test fixtures
- Merged the capability-map branch into `main` via `f791233`.

This made Capability Map grounding a required, self-approved part of the
Treegress workflow rather than an optional planning artifact.

## How Treegress was used in `scan.datasatsto.se`

The scan repository is [`scan.datasatsto.se`](.).
Treegress records are stored under [`.treegress/`](.treegress), with workflow
guidance in [`CLAUDE.md`](CLAUDE.md).

The workflow was applied feature by feature:

1. Define the feature intent.
2. Generate or revise the Capability Map.
3. Generate a test strategy and test plan.
4. Approve the plan.
5. Implement the feature and add mapped tests.
6. Run Treegress verification.
7. Iterate when verification exposed missing or failing obligations.
8. Close features that reached the required verified state.

The repository contains Treegress contracts, intents, plans, strategies,
mappings, reviews, state files, and test-run evidence for 18 feature areas.

### September 13 feature work

- **Stored procedure reference page**
  - Added a navigable reference page with server and database information.
  - Commit: `dd32707`
  - Treegress status: **VERIFIED**

- **Interactive API page**
  - Added the interactive main page and parameter-entry behavior.
  - Refactored API parameter names to `event` and `vendorCode`.
  - Commits: `ba743ed` and `e913ff1`
  - `interactive-api-parameters-ui`: **VERIFIED**
  - `interactive-api-parameters`: **FAILED**, with rerun pending

- **PDF path coverage**
  - Added PDF-path tests and fixed CI test discovery.
  - Commit: `6901d06`
  - Treegress status: **FAILED**, with rerun pending

- **Run-call navigation**
  - Added behavior and unit/E2E coverage so “Run” navigates to the represented
    endpoint URL.
  - Commit: `65b1e5c`
  - Treegress status: **VERIFIED**

- **Playwright screenshot configuration**
  - Added a separate screenshot-forcing Playwright configuration and E2E
    coverage.
  - Commit: `2eb7d85`
  - Treegress status: **REVIEWED**, awaiting closure

- **Playwright minimum setup**
  - Tracked the minimal browser-testing setup, app startup, Chromium/CI
    configuration, and smoke test.
  - Treegress status: **VERIFYING**

- **Random scan and registration coverage**
  - Added unit tests for random scan and registration behavior.
  - Commit: `99492bb`

### September 14 feature work

- **Direct QR scan note form**
  - Added a note form before direct QR scan submission.
  - Added a clear “Submit without note” path.
  - Preserved and displayed the selected vendor code from the cookie.
  - Commits: `e464825`, `d9859b5`, and `7152df2`
  - Treegress status: **REVIEWED**, awaiting closure

- **ID-only scan submissions**
  - Fixed submissions where only the scan ID was supplied.
  - Commit: `d9859b5`

- **Database schema deployment**
  - Made schema deployment idempotent.
  - Commit: `8f19326`

- **Separate authorization QR**
  - Added a separate path for generating and displaying the authorization QR
    without exposing the main page to unauthorized visitors.
  - Commit: `5534c30`
  - Treegress status: **VERIFIED**

- **Human-readable authorization URL**
  - Tracked the requirement to show the authorization URL in readable form
    alongside the QR code.
  - Treegress status: **FAILED**, with rerun pending

## Current Treegress status

| Status | Features |
|---|---|
| **VERIFIED** | attendee registration, batch/random ID generation, home-page API index, interactive API parameters UI, report, run-call navigation, scan recording, scanner setup, separate authorization QR, stored-procedure reference page |
| **REVIEWED** | direct QR scan note form, screenshot Playwright configuration |
| **VERIFYING** | Playwright minimum setup |
| **FAILED** | human-readable authorization PDF URL, interactive API parameters, PDF path tests |
| **PLANNING / TEST_PLAN_DRAFT** | interactive API call runner, platform health check |

## Overall pattern

Treegress was used as more than a final test runner. It shaped feature
contracts, generated tests, mapped implementation to scenarios, verified the
result, and preserved explicit state when a feature still required a rerun or
closure.

The tagged
[`eventbrite-identities.sql`](eventbrite-identities.sql) file is separate from
this Treegress feature-history trail. It is an attendee identity data script,
not one of the Treegress feature artifacts.
