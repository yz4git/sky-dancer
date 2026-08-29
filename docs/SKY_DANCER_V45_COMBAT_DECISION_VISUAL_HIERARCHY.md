# Sky Dancer V45 — Combat Decision & Visual Hierarchy

V45 turns the V43/V44 three-dimensional flight foundation into a combat-reading system. It deliberately adds **no new player controls**. Steering, SHOT and Turbo remain the interaction surface; enemy type, altitude and timing now change when those same controls are most effective.

## Player-facing combat decisions

The currently locked target publishes one compact decision near the gunsight:

- target class
- vertical offset in meters (`▲ +Nm`, `▼ -Nm`, `◆ LEVEL`)
- range
- one immediate action line

The action line and missile damage share the same source of truth in `SkyDancerCombatDecisionV45.ts`.

### Striker

Striker dive phases are readable timing windows. During the counter/recovery phase the HUD shows `COUNTER WINDOW · FIRE` and a missile can finish the fighter. Outside that window a missile is intentionally a glancing hit, so firing continuously is less efficient than reading the pass.

### Orbiter

Orbiter is vulnerable when vertical separation opens a high-arc seeker lane. At sufficient altitude separation the HUD shows `HIGH ARC · FIRE`; near the player's altitude it shows `ORBITING · WAIT SEPARATION`.

### Heavy / Tank

Heavy aircraft resist normal missile fire. High player speed changes the state to `TURBO STRIKE · COMMIT`, producing substantially more missile damage. The design goal is to give Turbo tactical value without adding an attack button.

### Bomber / Drifter / Standard fighter

Bomber is a high-priority fragile threat (`PRIORITY · FIRE EARLY`). Drifter communicates a lead-shot problem (`JINKING · LEAD SHOT`). Standard fighters remain the simple baseline (`LOCK · FIRE`).

### Boss

Boss damage is tied to the existing V34 core state. Closed core receives low missile damage and communicates `TRACK RUN · WAIT CORE`; open core becomes the main fire window. V45 also synchronizes altitude to the boss state:

1. `ORBIT`: high lane / climb preparation
2. `STRIKE`: dive through the player's altitude plane
3. `BREAK`: low-lane exit with the core vulnerability window

A faint 3D attack lane and pulse telegraph the STRIKE without obscuring the target.

## Visual hierarchy

### Target information

V44's world-space altitude cue remains. V45 adds numeric altitude only for the active lock so the player does not need to decode depth from perspective alone.

### Missile readability

Player missiles gain a 42-point smoke ribbon that can persist for roughly 0.86 seconds. The ribbon is wider than the previous thin light trail and drifts subtly upward as it ages, making vertical guidance curves easier to read.

### Speed hierarchy

Normal-speed streak/rush effects are reduced to roughly 34% of their base opacity when the effect objects expose a compatible material. Turbo restores the original strength. The goal is not more particles; it is a larger perceptual difference between normal flight and Turbo.

### Background contrast

The final city/field presentation roots are darkened moderately at the V45 layer. This keeps the existing environment geometry and art direction while reserving the brightest contrast for aircraft, missiles, locks and warnings.

### Boss HUD

During the boss encounter the Stage strip is compressed upward, HEAT moves to a smaller upper-right card, the missile warning occupies its own lane, and a single boss directive describes the current action. The target area around the gunsight stays clear.

## Architecture

- `SkyDancerCombatDecisionV45.ts`: gameplay decision/damage source of truth
- `SkyDancerPlayerWeapons.ts`: target priority, timing-sensitive missile damage, lock snapshot
- `SkyDancerBossAttackRunV45.ts`: boss mode → altitude synchronization
- `SkyDancerV45DecisionHierarchyPass.ts`: smoke ribbon, speed/background hierarchy, boss attack lane, decision event/debug bridge
- `SkyDancerHudV45.tsx`: numeric lock/action and boss HUD hierarchy
- `tests/sky-v45.test.ts`: rule and wiring regressions
- `scripts/webgl-v45-decision-audit.mjs`: iPhone-like SwiftShader visual/gameplay gate

## Validation gates

V45 keeps every existing V39/V41/V43/V44/Boss/Turbo/full-stage WebGL gate. The V45-specific audit additionally checks for a readable locked decision, numeric altitude, player missile smoke ribbon, normal/Turbo hierarchy states, background tuning, boss strike telegraph/directive and Stage-vs-HEAT HUD separation.

As part of V45, the normal `test:rules` command was also expanded to include V43, V44 and V45 regressions so future CI cannot silently stop at V42.
