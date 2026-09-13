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

## HW2-A

For HW2-A, I used ChatGPT as a review and analysis assistant, while I made the high-level design decisions and all final judgments myself.

For the CI design, I first determined the overall structure based on principles covered in class. I decided to run inexpensive checks first, defer heavier processing to later stages, and separate type-checking to improve performance. After drafting the initial workflow, I asked ChatGPT to review the job dependencies and the details of the .yml configuration. I incorporated its feedback to refine job ordering and conditional execution, and I finalized the CI design myself.

For the hw2-safe and hw2-unsafe test suites, I chose to base the testing approach on the work from HW1. I decided to focus on areas that are critical to the service's correctness. ChatGPT proposed several concrete test cases, including boundary tests for minimum quantities and regression tests for client-side price tampering. I evaluated these suggestions and selected the ones I considered appropriate. All decisions about which tests to include or remove were made by me.

During development, ChatGPT helped identify that the hw2-unsafe branch had been created from an outdated commit. Merging it as-is would have caused inconsistencies with the current CI and test configuration. To avoid this, I recreated the branch from the latest main and reapplied the necessary changes. This ensured that the work remained aligned with the updated project structure.