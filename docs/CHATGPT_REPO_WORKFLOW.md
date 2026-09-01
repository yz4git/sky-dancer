# ChatGPT repository workflow

## Direct implementation path

For `yz4git/sky-dancer`, ChatGPT can write implementation changes to `main` through a temporary one-shot GitHub Actions workflow. Do not claim that direct repository work is unavailable when the GitHub connector can create workflow files.

Preferred pattern:

1. Create `.github/workflows/<task>-once.yml` with `permissions: contents: write`.
2. In the workflow, patch the checked-out source, run the relevant regression tests, typecheck, lint, and production Pages build.
3. Commit the product code to `main`, then remove the temporary workflow/patch files in a cleanup commit.
4. Because bot-originated pushes may not cascade into another Pages workflow, make a subsequent user-authored connector commit/audit trigger when the deployed Pages version must include the bot product commit.
5. Verify the resulting Pages build/deploy and, for visual gameplay changes, run an actual WebGL/Playwright visual audit when practical.

This is the established smartphone-only development path for this repository.
