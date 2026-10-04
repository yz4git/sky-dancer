# Sky Dancer

Sky Dancer is the airborne starting point for a gradual Cart Rogue evolution
on iPhone Safari. The first slice keeps Cart Rogue's route graph, arcade
steering, auto-drive, GAS, BRAKE, TURBO hold/release, Turbo Ram, enemies,
obstacles, gates, and run progression. Only the vehicle and the course surface
have been changed into aircraft and floating flight decks.

## Initial playable slice

`STEER THE AIRCRAFT → TURBO RAM → BREAK THROUGH THE AIR ROUTE → CLEAR THE RUN`

- A stylized aircraft runs across connected floating flight decks.
- Drag the lower-left area to steer, matching Cart Rogue's arcade input.
- Hold TURBO to drift, then release for the dash; BRAKE is beside it.
- `A/D` or arrow keys steer, `S`/down brakes, and `Space`/`Shift` uses TURBO.
- Turbo Ram, rock smash, route gates, pickups, stage clears, and upgrades stay
  on the Cart Rogue ruleset for the next incremental changes.
- The WebGL renderer and Canvas 2D fallback share the same Cart Rogue session.
- The layout is landscape-first and safe-area aware for iPhone Safari.

## Development

```bash
npm ci
npm run build:pages
npm test
npm run lint
```

`cart-rogue` remains a read-only reference. The existing Cart Rogue Sites
configuration is intentionally not copied into this repository.


## REDox-style Mission IR

Sky Dancer now shares a stable, dependency-aware Mission IR across Arcade Run, Turbo Hunt, and SKY RAID. Authored stages/acts remain the source of truth, while runtime Mission Patches can change only the active director node and propagate impact to dependent camera, encounter, target-population, combat, or flight artifacts.

- Arcade Run keeps authored combat timing and patches active-beat camera framing.
- Turbo Hunt patches active target population from hunt state.
- SKY RAID patches the current act's pressure, rush target, kill target, speed, and handling.
- Stable node/content/revision hashes make changes deterministic and inspectable.
- Browser runtime changes emit the `sky-dancer-mission-patch` event.

See [docs/SKY_DANCER_MISSION_IR.md](docs/SKY_DANCER_MISSION_IR.md) for the architecture and compatibility rules.
