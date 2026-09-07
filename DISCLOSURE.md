# AI Use Disclosure

## HW1-A

I used ChatGPT as a review and investigation assistant, while I developed the initial defect hypotheses and testing approach myself.

For defect investigation, I first identified possible issues based on my own observations and reasoning. These included whether frontend and backend restrictions were inconsistent, whether application state could be overwritten during an active session, and whether related rules were implemented consistently across different layers of the application. I then used ChatGPT to inspect the relevant implementation, trace behavior across components, and evaluate whether the code supported or contradicted my hypotheses. Based on that analysis, I personally reproduced each behavior in the running application and verified the evidence before preparing the defect reports.

For automated testing, I developed the test scenarios based on the idea of a pre-operation health check, similar to the morning health-check batch jobs used in production systems. I selected behaviors that I considered necessary to confirm that this application was functioning correctly, including a normal customer path and important limits or error conditions. I used ChatGPT to review these test ideas, identify missing cases, and help refine the test implementation. I personally ran the tests, interpreted the results, and confirmed that `./scripts/check` completed successfully.

I made the final decisions about which behaviors qualified as defects, which tests to retain, and what evidence and explanations to include. I also reviewed the final output and removed credentials and other sensitive information before submission.

## HW1-B

For HW1-B, I implemented fixes for the three approved defects based on the behavior and evidence I had already confirmed in HW1-A.

For the checkout-pricing defect, I fixed the server to use the authoritative ticket price instead of trusting the client-supplied total. For the General Admission limit defect, I added server-side `maxPerOrder` validation and boundary tests for quantities above and exactly at the limit. For the reservation-expiry defect, I used a configurable timeout so the expiration behavior could be tested without waiting for the full production hold period.

I used ChatGPT mainly to review the relevant code paths, challenge my proposed fixes, and check the regression-test coverage. I made the final implementation and testing decisions myself.

I developed the fixes in three independent branches and submitted separate pull requests for each approved issue. After merging them, I resolved the merge conflicts, rebuilt the services, and personally ran `./scripts/check` on the final `main` branch. All 12 automated tests passed.