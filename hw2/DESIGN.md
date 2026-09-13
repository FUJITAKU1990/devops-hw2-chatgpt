# HW2 Design

## Checks and enforcement

- Implementation:
  https://github.com/cmu-devops/17636-f26-tfujio/blob/9f0a2664bbca9821744b633baf0395151f51f2ff/.github/workflows/ci.yml

- Design principle:
  Run inexpensive and fast checks first, followed by heavier checks that start and exercise the actual application. This detects problems early and avoids unnecessary Docker builds and E2E tests.

- npm ci:
  Reproduce dependencies exactly from package-lock.json. This detects inconsistencies such as updating package.json without updating the lockfile.

- Shared packages + TypeScript + frontend:
  * build:database / build:mail:
    Verify that shared packages used by the services can be built before attempting to start the services.
  * tsc --noEmit:
    Detect type errors in the three services before runtime, such as callers not being updated after a function signature change.
  * Frontend build:
    Detect frontend syntax and build errors.

- docker compose config -q:
  Validate the Compose configuration before starting containers, catching configuration errors at lower cost.

- Full application startup:
  Run docker compose up --build -d and poll /api/events until the application responds. This verifies that the stack can start with the actual dependencies among the database, APIs, and frontend, rather than only confirming that individual components build.

- ./scripts/check:
  Run the HW1 safety-net tests and the additional HW2 tests, including the customer flow from registration through purchase and order confirmation. This catches application-logic problems, such as incorrect price calculations, that static checks and builds cannot detect.
  The tests use fresh data on every run: customer email addresses are generated uniquely per execution, ticket types and inventory are created through the admin API during the test, and no existing database state is reused. This satisfies the Shared Purchase Contract requirement for fresh, variable valid inputs.

- CI execution controls:
  Job timeout is capped at five minutes, and superseded PR runs are cancelled. Docker logs are printed on failure to support diagnosis.
  These controls ensure that CI results remain reliable and reproducible, preventing stale or superseded runs from being mistaken for valid protection.

- Merge enforcement:
  The ci check is required before merging into main.
  strict: true ensures the PR is tested against the latest main, preventing merges based on stale results.
  enforce_admins: true prevents repository administrators from bypassing the protection.

## Exercise evidence

- hw2-safe
  PR: https://github.com/cmu-devops/17636-f26-tfujio/pull/8
  Run: https://github.com/cmu-devops/17636-f26-tfujio/actions/runs/34630618144
  * What changed:
    Added tests/hw2-safe-min-quantity.test.ts, which verifies that checkout succeeds when purchasing only one GA_POOL ticket. No application code was changed.
  * What happened:
    CI completed successfully in approximately 2m44s. All checks passed, and the PR was merged into main.

- hw2-unsafe
  PR: https://github.com/cmu-devops/17636-f26-tfujio/pull/9
  Run: https://github.com/cmu-devops/17636-f26-tfujio/actions/runs/34736372221/job/103668427061?pr=9
  * What changed:
    Modified one part of the logic in services/ticket-service/index.ts.
    Instead of trusting only the server-computed authoritative subtotal, the new logic preferred the client-provided totalPriceCents when present.
  * Which check rejected it:
    The existing hw1b-authoritative-checkout-price.test.ts failed.
    The log showed the endpoint returning totalAmountCents: 1, meaning the application actually accepted a client-tampered checkout price of one cent.
    This was not merely a failing assertion: it demonstrated a real regression in the authoritative pricing logic.
    CI therefore failed, and the PR remained unmerged.