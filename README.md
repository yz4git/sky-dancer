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
