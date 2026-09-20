# HW2 Design

## Checks and enforcement

- Implementation:
  https://github.com/cmu-devops/17636-f26-tfujio/blob/main/.github/workflows/ci.yml

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

- secrets-scan (category 3, B only):
  Use gitleaks to scan the entire range of commits included in a PR, rather than only the tip commit. This ensures that credentials added in one commit and removed in a later commit can still be detected. The gitleaks binary is version-pinned and its checksum is verified before execution. This prevents an unreviewed external binary from being automatically updated and executed in CI without human review.
  Implementation:
  https://github.com/cmu-devops/17636-f26-tfujio/blob/1a6a9e6/.github/workflows/ci.yml (`secrets-scan` job)
  https://github.com/cmu-devops/17636-f26-tfujio/blob/1a6a9e6/.gitleaks.toml

- guardrails-check (category 4, B only):
  Check that the ten variables in `docker-compose.yml` (Findings 1-3 plus the two rotated fixture-account passwords from the re-review) have not been reverted to weak default values such as `:-postgres`. On re-review, I extended this job to also scan `services/`, `database/`, and `packages/` source for `process.env.<name> || <literal>` fallbacks on secret-shaped variable names, since docker-compose.yml enforcing a variable is meaningless if the application code itself falls back to a fixed value when a service is run outside Compose. This extension caught a residual `TARTANPAY_API_KEY || ''` fallback that the original guardrails-check had not been scoped to see.
  Implementation:
  https://github.com/cmu-devops/17636-f26-tfujio/blob/main/scripts/check-secret-guardrails

- ci-integrity-check (category 5, B only):
  Check that `ci.yml` itself has not been weakened using mechanisms such as `continue-on-error` or `|| true`. If `secrets-scan` or `guardrails-check` can itself be disabled, the previous protections lose their effectiveness. In addition, this script and `check-secret-guardrails` inspect each other's contents, to prevent one of the two scripts from being modified without detection.
  On re-review, I found and fixed two ways this check could itself be bypassed: the `ref:` detector was anchored to the start of the line, so YAML flow-mapping syntax such as `with: { ref: '<sha>' }` pinned a fixed checkout revision without being caught; and the per-job timeout count assumed a fixed two-space indent under `jobs:`, so re-indenting the workflow could hide a newly added job with no timeout from the count. Both were fixed to no longer depend on a specific literal form.
  Implementation:
  https://github.com/cmu-devops/17636-f26-tfujio/blob/main/scripts/check-ci-integrity

- CI execution controls:
  Job timeout is capped at five minutes, and superseded PR runs are cancelled. Docker logs are printed on failure to support diagnosis.
  These controls ensure that CI results remain reliable and reproducible, preventing stale or superseded runs from being mistaken for valid protection.

- Merge enforcement:
  All four jobs (ci, secrets-scan, guardrails-check, ci-integrity-check) are required status checks before merging into main (B only: previously only ci was required). If only ci were required, the other three jobs could be removed in a PR and the PR could still be merged, because non-required checks have no enforcement power.
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

- hw2-secret (B only)
  PR: https://github.com/cmu-devops/17636-f26-tfujio/pull/16
  Run: https://github.com/cmu-devops/17636-f26-tfujio/actions/runs/35308651870?pr=16
  * What was exposed:
    A synthetic AWS key was added in the first commit and removed in the second commit. This reproduces a case that would not be detected by a scan that looks only at the tip commit.
  * Which check rejected it:
    Because secrets-scan scans the full commit history of the PR, it detected the key and rejected the PR. The PR remains unmerged.

## Judgment (B only)

- I also considered automatically tracking and using the latest version of gitleaks, but decided not to adopt that approach. Doing so would allow an unreviewed external binary to be executed in CI without human judgment. Instead, I pinned the version and added checksum verification so that an update occurs only when I explicitly decide to make one.

- Remaining limitation: The detection performed by ci-integrity-check and check-secret-guardrails relies on grep-based string pattern matching and does not understand the actual semantics of shell scripts or YAML. The mutual checks between the two scripts make it possible to detect cases where only one of them is weakened. However, there is still a possibility that an equivalent weakening written in an unexpected form could bypass the current checks.
