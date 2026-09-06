# Test policy

`npm run test:rules` automatically runs every `tests/sky-*.test.ts` file. Do not maintain a manual file list.

Keep tests behavior-oriented. Prefer exported rules, state transitions, geometry/math invariants, input-release safety, persistence, and bounded runtime behavior. A refactor that preserves behavior should normally preserve these tests.

Do not create chronological `sky-vXX.test.ts` regression files. When a new pass adds lasting behavior, add the smallest assertion to the relevant current suite (`sky-flight-runtime`, `sky-combat-runtime`, `sky-campaign`, `sky-sky-raid`, or an Arcade suite). Visual quality belongs in browser/WebGL audit workflows rather than source-text snapshots of every rendering pass.

Source-text assertions are reserved for small architecture/safety contracts that are difficult to observe in Node, such as iPhone pointer-release recovery or legacy Turbo input isolation. Do not use them to freeze private class names, inheritance order, exact rendering object names, or visual tuning literals.
