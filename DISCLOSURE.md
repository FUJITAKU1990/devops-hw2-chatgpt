# AI Use Disclosure

## HW1

I used ChatGPT as a review and investigation assistant, while I developed the initial defect hypotheses and testing approach myself.

For defect investigation, I first identified possible issues based on my own observations and reasoning. These included whether frontend and backend restrictions were inconsistent, whether application state could be overwritten during an active session, and whether related rules were implemented consistently across different layers of the application. I then used ChatGPT to inspect the relevant implementation, trace behavior across components, and evaluate whether the code supported or contradicted my hypotheses. Based on that analysis, I personally reproduced each behavior in the running application and verified the evidence before preparing the defect reports.

For automated testing, I developed the test scenarios based on the idea of a pre-operation health check, similar to the morning health-check batch jobs used in production systems. I selected behaviors that I considered necessary to confirm that this application was functioning correctly, including a normal customer path and important limits or error conditions. I used ChatGPT to review these test ideas, identify missing cases, and help refine the test implementation. I personally ran the tests, interpreted the results, and confirmed that `./scripts/check` completed successfully.

I made the final decisions about which behaviors qualified as defects, which tests to retain, and what evidence and explanations to include. I also reviewed the final output and removed credentials and other sensitive information before submission.
