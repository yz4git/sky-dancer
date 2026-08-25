# Sky Dancer V42 continuity fix

V42 fixes three visible regressions found during real play after V41:

1. Player aircraft surface/tail-adjacent presentation must share the banked `playerVisual` root. Presentation construction happens before the WebGL fighter rebuild, so V37 reattaches the kit after rebuild on every update rather than attaching it to `session.car.group`.
2. Cleanup holding aircraft keep a fixed world-direction offset captured when cleanup begins. Player yaw no longer rotates held enemies around the camera, and hold correction speed is capped at 36 m/s with tangent-facing guidance.
3. V36 primary city and V40 expanded city scenery are anchored at their initial world tile. V41 remains the sole rolling terrain owner; decorative buildings/roads no longer jump/reseed on each 420 m boundary.

Regression coverage:
- source-level V42 tests,
- real WebGL banked-airframe capture,
- V41 terrain-boundary crossing while V36/V40 city root positions remain unchanged,
- existing V34 boss, Turbo isolation and V40 stage-cycle audits remain required.
