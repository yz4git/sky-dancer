# Arcade Run tuning — 2026-08-31

This pass records the playability/readability contract added after iPhone playcheck feedback.

- Faster 2-axis player response: normal X/Y targets 1.55 / 1.42; Turbo 1.90 / 1.72; response 11.8.
- Enemy fly-bys stay alive to depth -11.5 and the WebGL camera near plane is 0.04, preventing premature visual popping near the player/camera.
- Route-choice guidance is a compact top-edge navigator rather than a large center-screen overlay.
- Boss durability is raised to 550+ HP for the opening climax family and 1280 HP for the final climax target before difficulty scaling.
- Runtime regression tests cover steering response, boss durability, fly-by lifetime, camera near clipping, and compact route guidance.
