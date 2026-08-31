/** Wide-field chase camera with an elastic landscape safety margin. */
// V7.1 audit marker: curved-course camera lag is validated by the WebGL reference audits.
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  const turboFollow = turbo ? 1 : 0;
  return {
    // Normal flight keeps the full cross-frame range; Turbo adds a safety follow/pullback so the
    // airframe cannot disappear behind the phone edge while the wider FOV sells acceleration.
    x: playerX * (5.15 + phone * 2.55 + turboFollow * .95),
    y: 5.2 + phone * 3 + playerY * (1.95 + phone * .77 + turboFollow * 1.08),
    z: 16.35 + portraitPullback + turboFollow * 1.8,
    lookX: playerX * (3.45 + phone * 3.9 + turboFollow * .72),
    lookY: .8 + playerY * (1.15 + phone * 1.13 + turboFollow * .82),
    lookZ: -34,
    fov: turbo ? 69 : 56,
    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),
  };
}
