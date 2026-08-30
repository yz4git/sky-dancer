/** Shared camera framing: visible hero airframe at both stick extremes and on phones.
 * 2026-08-31 readability pass: close fly-bys are retained by runtime/WebGL near-plane tuning.
 */
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  return {
    x: playerX * (3.2 + phone * 4.6),
    y: 5.2 + phone * 3 + playerY * 2.8,
    z: 15.8 + portraitPullback + (turbo ? .7 : 0),
    lookX: playerX * (2 + phone * 5.8),
    lookY: .8 + playerY * 2.2,
    lookZ: -34,
    fov: turbo ? 62 : 55,
    roll: -playerX * .018,
  };
}
