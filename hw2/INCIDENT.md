# HW2 Incident

## Findings and containment

### Finding 1: TartanPay API Key and Admin Token
- Location and access: docker-compose.yml hard-coded the TartanPay API key and admin token as environment-variable default values (${TARTANPAY_API_KEY:-...} and ${TARTANPAY_ADMIN_TOKEN:-...}). In addition, TARTANPAY_LOG_SECRETS defaulted to true, causing these values to be written to logs. If exposed, these credentials could have allowed administrative access to the payment service.
- Decision and action: Replaced both hard-coded values with required environment
 variables (TARTANPAY_API_KEY and TARTANPAY_ADMIN_TOKEN) and removed their default values from the code. The default value of TARTANPAY_LOG_SECRETS was also changed to false.
- Verification: In the Prepare env step of ci.yml, fresh random values are generated using openssl rand -hex on every CI run, and the CI workflow confirms that the application starts and operates correctly with those values. I also confirmed that Docker Compose refuses to start when the required environment variables are missing by using the ${VAR:?...} syntax. The secrets-scan job continuously verifies that no plaintext secret values are present in the current code or logs.

### Finding 2: Weak Default Credentials for DB/JWT/Admin/Mailpit
- Location and access: Multiple locations in docker-compose.yml, including the database, JWT signing key, administrator account, and Mailpit, fell back to well-known weak default values. As a result, the system could start with predictable credentials even when the required environment variables had not been configured.
- Decision and action: Changed POSTGRES_PASSWORD, JWT_SECRET, PAYMENT_DB_PASSWORD, TARTAN_ADMIN_PASSWORD, and MP_UI_AUTH to required environment variables and removed their default values.
- Verification: As with Finding 1, CI generates fresh random values and confirms that the application starts successfully with them. The :? syntax causes startup to fail when required values are missing, and guardrails-check continuously verifies that weak defaults have not been reintroduced.

### Finding 3: Hard-Coded Student Account Password in Fixture
- Location and access: In database/src/fixtures.ts, the password for the test account student@cmu.edu was hard-coded in plaintext.
- Decision and action: Replaced the hard-coded password with the required environment variable STUDENT_FIXTURE_PASSWORD.
- Verification: I confirmed that the fixture-loading process fails with an error when the environment variable is not set. With the variable configured, ./scripts/check completes successfully, including tests that log in using this account.

### Finding 4: Release Operator / Support Agent Passwords Were Still Recoverable
- Location and access: database/src/fixtures.ts hard-coded bcrypt hashes for the seeded Release Operator (admin role) and Support Agent accounts. I had judged these harmless as one-way hashes.
- Decision and action: On re-review, I confirmed these hashes are hashes of the exact plaintext passwords committed in an earlier commit and still visible in git history, so no brute force was needed and the earlier "harmless" judgment was wrong. Replaced both hashes with required environment variables (RELEASE_OPERATOR_PASSWORD, SUPPORT_AGENT_PASSWORD) and removed the corresponding allowlist entries from .gitleaks.toml.
- Verification: Confirmed the old hashes no longer appear in the current tree, and that fixture seeding fails when the two new required variables are unset.

### Test-only `Hw2Passw0rd!` (harmless)
- Location and access: This value appears only in tests/hw2-shared-purchase-contract.test.ts (line 105).
- Decision and action: No change. I confirmed it is not used as a credential for any real account, environment, or external service.
- Verification: Confirmed via grep across the repository that the value appears nowhere else.

## Fresh credentials
- The Dev Container's postCreateCommand and the CI workflow both call scripts/generate-env-secrets, which fills any blank required variable in .env with a value from openssl rand -hex. This runs automatically on container creation, so no manual step is required, though the script can be re-run by hand at any time. .env.example itself contains no actual credential values, only empty placeholders.