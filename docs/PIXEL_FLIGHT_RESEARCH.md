# PIXEL FLIGHT — research, implementation, and integration (2026-11-17)

## Why an isolated fifth mode
Sky Dancer already has ARCADE RUN, SKY RAID, TURBO HUNT and STAGE PRACTICE. PIXEL FLIGHT is an explicitly selectable fifth mode, with **no shared WebGL state or runtime changes** and a new Canvas 2D rendering pipeline. The existing modes remain untouched and are still the product baseline. No copyrighted map/art assets are imported.

## Sources reviewed
| Project | Relevant idea | Limitations / adoption |
|---|---|---|
| [UI8 Forge fighter](https://forge.ui8.ai/share/frag_1eb8944c-57b1-42ca-a909-5c2d7e517c24) | Pixel flight, island height fields, 2D-only aircraft | Shared preview HTML is JS-rendered, source not independently verified; visual and conceptual reference only |
| [Dash post / contemporary prompt](https://www.teapawt.org/kirisando/status/2122073786438521236) | 300×250 software buffer, tileable island noise, 16 aircraft slices, top/chase transition | Social description, not proof of particular file contents |
| [loktar00/sprite-stacking](https://github.com/loktar00/sprite-stacking) | Reusable cross-sectional sprite-stack composition and palette design | Camera banking and side-on perspectives are fundamentally limited |
| [s-macke/VoxelSpace](https://github.com/s-macke/VoxelSpace) | Classic Comanche-inspired height+color map / column marching with occlusion clip | 2.5D land cannot represent caves or true overhangs |
| [varganorbert222/VoxelSpace](https://github.com/varganorbert222/VoxelSpace) | CPU JS/WASM and optional WebGPU, LOD, mobile controls | Too heavyweight for this first isolated mode; avoid 86 third-party maps |
| [Emergent Mind Voxel Space](https://www.emergentmind.com/visualizations/voxel-space) | CPU low-resolution height-field flyover, distance fog, camera flight | Good benchmark for next landscape lighting/erosion work |
| [Emergent Mind Voxel Diorama](https://www.emergentmind.com/visualizations/voxel-diorama) | Software voxel faces, AO, silhouettes | A different rendering family; future experiments only |

**Chosen architecture:** software-rendered **VoxelSpace-style column terrain** + independent **16-layer 2D sprite-stack aircraft**. This is a deliberately original implementation guided by publicly explained algorithms, not a copy of the Forge project's source.

**Licensing:** s-macke/VoxelSpace describes its *software* as MIT, while bundled Comanche maps are excluded. This mode generates all terrain and aircraft visuals from original code. No licensed map files or third-party sprites are copied.

## Gameplay delivered
- 120-second ocean/island gate flight, with deterministic seeded tileable height map
- Turn, climb, dive, turbo boost and recharge; 3 shields (ACE: 2)
- Golden air gates give points (boost captures award extra), replenish boost, and spawn new routes
- Height-based collision risk, low-altitude scoring and airframe failure; best-score local storage
- CHASE, MAP and COCKPIT views, all rendered in Canvas 2D
- iPhone landscape, safe-area-aware touch stick and independent multi-touch boost/climb/dive buttons
- Keyboard: arrows/WASD, Space/Shift for boost, C for camera, Escape for shared pause
- Fixed 60 Hz simulation, clamped elapsed time, adaptive low-resolution framebuffer, nearest-neighbour upscale
- Mode-specific renderer isolated from Three.js and existing missions. Shared title/pause flows remain active.

## Follow-up evaluation (not claimed done)
- **Real iPhone Safari performance:** measure 60 fps sustained, battery/thermal after 10+ minutes and latency under simultaneous touches; automated tests cannot replace this.
- True camera interpolation, moving cloud layers and more dramatic bank silhouettes; sprite stacking itself cannot fully bank like a skinned 3D model.
- Targeting and combat missions (current PIXEL FLIGHT is a gate-and-terrain flight mode).
- Compare Canvas 2D vs OffscreenCanvas-worker vs WASM and optional WebGPU only if profiling proves CPU rasterization a bottleneck.
- A/B test the feel against UI8's published preview; the Forge editor/preview could not be executed in this environment.

## Sanity checks
`npm run test:rules` includes `tests/sky-pixel-flight.test.ts` and checks deterministic wrapping, flight controls, score and collisions. Existing `npm test`, `npm run lint`, `npm run validate:artifact` and GitHub Pages workflow must also pass prior to production promotion.
