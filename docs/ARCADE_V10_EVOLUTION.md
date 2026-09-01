# Sky Dancer Arcade V10 Evolution

V10 integrates five selected pillars directly into the existing two-to-four minute Arcade Run instead of creating a separate mode.

## 1. Combat 2.0
- Every enemy exposes a combat role used by lock/gun threat prioritization.
- Missile boats, bombers, aces and bosses gain an armor layer while basic fighters remain fast kills.
- Missiles strip armor efficiently; gun pressure can stagger enemy fire.
- Every third chained kill becomes a FORMATION BREAK with score and Turbo reward.
- Runtime tracks best chain, armor breaks and formation breaks as first-class run metrics.

## 2. Boss Battle 2.0
- Bosses move through three real HP phases: OUTER ARMOR, CORE WINDOW and FINAL ASSAULT.
- Phase changes move the boss closer, increase maneuver pressure and alter projectile spread/guidance/cadence.
- Phase 2/3 create recurring CORE OPEN windows with amplified gun/missile damage.
- Phase transitions inject the current stage's hazard identity instead of becoming a disconnected arena battle.

## 5. Stage Evolution
- Every biome owns two authored gameplay events at roughly 18% and 62% course progress.
- Events use stage-native hazards: towers in the city, lightning in storms, rock collapse in volcano/ice, debris in orbit, etc.
- Events award risk score/Turbo and remain capped to the existing bounded entity budgets.

## 7. Cinematic Gameplay
- Stage beats, armor breaks, formation breaks and boss phase transitions feed PresentationDirector envelopes.
- FOV, pullback, shake, bloom and exposure respond while the player retains full flight and weapon control.
- WebGL boss weak points visibly brighten/pulse during CORE OPEN.
- Existing pooled V9.8/V9.9 explosion, debris and rush effects are reused rather than adding unbounded FX.

## 9. Arcade Meta Layer
- Local progress migrates from v1 to v2 automatically.
- Career totals: kills, near misses, boss kills, armor breaks, formation breaks and best chain.
- Best scoring route is stored alongside existing stage records and best run rank.
- Milestone rewards unlock paint/loadout slots: SUNSET, STORM, PRISM, MISSILE FOCUS and GUN FOCUS.
- Title screen exposes best score/rank, boss total, best chain and total unlock count.

## Quality gates
V10 must pass the existing rules suite, arcade typecheck, lint and Pages production build before product code reaches main. A final 844x390 mobile WebGL audit must then visually verify normal combat, stage event, boss phase/core-open and HUD readability before release is considered complete.
