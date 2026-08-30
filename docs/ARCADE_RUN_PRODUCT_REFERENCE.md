# Arcade Run product reference

![Arcade Run product concept](./arcade-run-product-reference.png)

This generated concept frame is the visual target for Arcade Run. It is not
rendered directly in the game; the live scene recreates its hierarchy with
mobile-safe Three.js geometry and effects.

- Large cyan-and-white hero fighter in a close chase camera
- Golden-hour coastal megacity, river, skyline layers, mountains, and cloud deck
- Giant airborne carrier used as the climax-target silhouette
- Multiple enemy depth layers with crisp multi-lock brackets
- Curved missile trails, speed streaks, layered explosions, and debris energy
- Cyan and magenta route gates with a minimal safe-area HUD
- Landscape iPhone controls: flight pad on the left, FIRE / LOCK / TURBO on the right

The authored route remains deterministic and branches across eleven visual
biomes, while each seven-section run is paced to roughly two minutes.

## Implementation checkpoint — 2026-08-30

The reference reconstruction includes the beveled hero fighter and airborne
carrier, streamed city blocks with facade windows and a river, layered clouds
and sunlight, pooled missile trails/explosion effects, a bounded HDR composite,
and the compact combat HUD. Portrait and landscape camera framing use the same
camera-pose function tested against the actual airframe vertices.

The flight stick uses its visible center and a radial dead zone. Pointer release,
capture loss, pause, window blur, page hiding and orientation changes release
controls. Arcade Run and Stage Practice are isolated from the existing Turbo
Hunt renderer and overlays; the title keeps both game modes available.

Continuation verification: 163 rules tests and six PWA/startup tests passed;
the arcade TypeScript check passed; lint reported no errors (nine pre-existing
warnings outside this change). The agent preview reached the title and showed
the mode selector. Its initial load consumed the short browser-check budget,
so live WebGL gameplay, touch release on an iPhone, and visual parity with the
concept image are **not yet verified**. Geometry and input-unit tests do not
substitute for those checks.

Keep this implementation in the GitHub source as well as the existing Site.
The previous Site source had restored the Arcade Run files after a main-source
sync omitted them; a later sync must not remove this mode again. Keep unrelated
open review branches separate from this checkpoint.
