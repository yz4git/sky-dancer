# Sky Dancer

Sky Dancer is a mobile-first air-combat game for iPhone Safari. It uses the
Cart Rogue project's reusable TypeScript, three.js, PWA, touch-input, and
WebGL/Canvas fallback foundation, while keeping the new game's source and
history independent.

## Initial playable slice

`MOVE THROUGH THE SKY → AIM THE AIRCRAFT → SHOOT DRONES → SURVIVE THE WAVE`

- A stylized aircraft flies above floating sky platforms.
- Drag in the lower-left control area to move horizontally and vertically.
- Hold FIRE on the lower-right side, or use `Space` on a keyboard.
- Destroy incoming drones to raise the score and wave.
- The WebGL renderer and Canvas 2D fallback share one fixed-step simulation.
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
