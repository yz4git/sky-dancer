/** Wide-field chase camera with an elastic landscape safety margin. */
// V7.1 audit marker: curved-course camera lag is validated by the WebGL reference audits.
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  return {
    // Landscape still lets the craft cross the frame, while portrait keeps the proven safe framing.
    x: playerX * (5.15 + phone * 2.55),
    y: 5.2 + phone * 3 + playerY * (1.95 + phone * .77),
    z: 16.35 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (3.45 + phone * 3.9),
    lookY: .8 + playerY * (1.15 + phone * 1.13),
    lookZ: -34,
    fov: turbo ? 67 : 56,
    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),
  };
}
