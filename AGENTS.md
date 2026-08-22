# Sky Dancer

## Project boundary

- This repository is the independent `yz4git/sky-dancer` project.
- `yz4git/cart-rogue` is a read-only source reference. Never push changes to it.
- Do not reuse Cart Rogue's Sites project ID or existing production deployment.

## Product direction

Sky Dancer is a mobile-first three.js air-combat game derived from the reusable
mobile/WebGL/PWA foundation of Cart Rogue. The initial playable slice replaces
the car with a stylized aircraft, the road with floating sky platforms, and
boost/race interactions with movement, enemy targets, and shooting.

## Verification

Run `npm test`, `npm run lint`, and `npm run validate:artifact` at meaningful
checkpoints. Keep the WebGL renderer and Canvas 2D fallback on the same pure
simulation rules.
