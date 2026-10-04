# Sky Dancer Mission IR

Sky Dancer uses a REDox-inspired mission intermediate representation to separate authored mission data from runtime adaptation.

The goal is not to replace the mature combat code. The Mission IR sits above it and lets a small stable node change invalidate only the systems that depend on that node.

## Data flow

```text
Authored mode data
  -> Mission IR
  -> Stable node IDs
  -> Dependency graph
  -> Runtime mission state
  -> Mission Patch
  -> Impact closure
  -> Existing Arcade / Turbo Hunt / SKY RAID systems
```

The core implementation lives in:

- `src/sky/mission/SkyDancerMissionIR.ts`
- `src/sky/mission/SkyDancerMissionCatalog.ts`

## Stable nodes

Every mission node has:

- a stable string ID
- a node kind
- a label
- canonical values
- explicit `dependsOn` edges
- a deterministic `sd1-...` content hash

The complete graph also has a deterministic revision hash.

Examples:

```text
arcade:stage:dawn-city
arcade:beat:dawn-city:city-entry
arcade:director:dawn-city:city-entry
arcade:artifact:camera:dawn-city:city-entry

turbo-hunt:phase:overdrive
turbo-hunt:director:overdrive
turbo-hunt:artifact:targets:overdrive

sky-raid:act:cloud-fleet
sky-raid:director:cloud-fleet
sky-raid:artifact:combat:cloud-fleet
sky-raid:artifact:flight:cloud-fleet
```

IDs describe semantic mission identity rather than a transient object allocation, so patches remain deterministic across runs.

## Runtime patches

A patch changes one or more node values:

```ts
skyDancerMissionPatch(
  "sky-raid-adaptive:cloud-fleet",
  "perfect-rush escalation",
  [{
    nodeId: "sky-raid:director:cloud-fleet",
    set: {
      pressureScale: 1.08,
      rushTargetOffset: 1,
    },
  }],
)
```

`SkyDancerMissionRuntime.applyPatch()`:

1. validates the patch format/version
2. canonicalizes changed node values
3. skips no-op writes
4. recalculates the changed node hash
5. walks the reverse dependency graph
6. returns changed and impacted stable IDs
7. updates the runtime revision hash
8. broadcasts `sky-dancer-mission-patch` in the browser

The authored base graph is immutable. Runtime state is isolated by owner object and game mode with a `WeakMap`.

## Arcade Run

Arcade Run is strongly authored and timing-sensitive. Mission IR deliberately preserves its existing wave, hazard, boss, and stage-transition timing.

The adaptive patch currently changes presentation for only the active timeline beat:

- low HP / recent damage -> recovery framing
- strong chain -> ace framing

Those patches alter camera FOV/pullback telemetry through the beat's director node while keeping encounter cadence at its proven authored values.

This is intentional: Arcade Run demonstrates partial presentation patching without weakening its movie-like two-minute course structure.

Future authored route outcomes can patch future stage/beat nodes explicitly without copying an entire stage definition.

## Turbo Hunt

Turbo Hunt is freer and can safely use Mission Patch for gameplay population.

Each phase has a stable director node. Runtime heat/order state can patch the active phase target population:

- maximum heat + completed orders -> one extra active target
- long low-heat reacquisition -> one fewer active target

When SKY RAID owns Turbo Hunt progression, the Turbo Hunt adaptive layer is bypassed so the two directors are never stacked accidentally.

## SKY RAID

Each act is represented as a stable segment/boss node with a dependent director plus combat and flight artifacts.

Runtime performance can patch only the current act:

- high chain -> higher pressure and slightly more speed
- repeated Perfect Rush -> higher rush requirement and pressure
- weak opening -> small kill-target/handling assistance

The resulting values feed existing SKY RAID systems:

- act kill target
- Perfect Rush target
- pressure
- max-speed scaling
- handling scaling

The rest of the act data, enemy doctrine, world style, scoring and camera systems remain authored and reusable.

## Dependency examples

```text
arcade:beat:dawn-city:city-entry
  -> arcade:director:dawn-city:city-entry
     -> arcade:artifact:camera:dawn-city:city-entry
     -> arcade:artifact:encounter:dawn-city:city-entry

turbo-hunt:phase:overdrive
  -> turbo-hunt:director:overdrive
     -> turbo-hunt:artifact:targets:overdrive

sky-raid:act:cloud-fleet
  -> sky-raid:director:cloud-fleet
     -> sky-raid:artifact:combat:cloud-fleet
     -> sky-raid:artifact:flight:cloud-fleet
```

A changed director therefore exposes exactly which downstream systems are dirty.

## Compatibility rule

Mission IR is an adaptation layer, not a rewrite of all proven Sky Dancer systems.

When no patch is active, the game must reproduce the existing authored behavior. New REDox-style features should normally:

1. add a stable IR node
2. connect explicit dependencies
3. patch that node
4. let existing systems read the resolved value

They should not duplicate whole stage/act definitions or bypass existing gameplay ownership.

## Testing

`tests/sky-mission-ir.test.ts` covers:

- canonical deterministic hashing
- dependency impact propagation
- no-op patch stability
- catalog construction for all three modes
- active-beat isolation in Arcade Run
- Turbo Hunt population patches
- SKY RAID pressure/rush patches

Existing Arcade, Turbo Hunt and SKY RAID regression tests remain the compatibility guard for the underlying game.
