# Test policy

`npm run test:rules` automatically runs every `tests/sky-*.test.ts` file. Do not maintain a manual file list.

Prefer tests of exported rules, state transitions, geometry/math invariants, input release behavior, persistence, and bounded runtime behavior. A refactor that preserves behavior should normally preserve these tests.

Avoid tests that only read production source files and assert exact private function names, numeric literals, inheritance spelling, or rendering implementation strings. Use source-text assertions only for a small architecture/safety contract that cannot reasonably be observed through a public API. Visual fidelity belongs in the browser/WebGL audit path rather than dozens of version-number regression tests.

Keep test filenames behavior-oriented (`sky-arcade-bosses.test.ts`) instead of chronological pass names (`sky-arcade-v112-*.test.ts`).
