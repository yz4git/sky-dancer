/** Wide-field chase camera: preserve visible screen-space travel before the camera catches up. */
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  return {
    // Landscape deliberately lags so the craft traverses the screen; portrait restores the proven safe framing.
    x: playerX * (4.55 + phone * 3.15),
    y: 5.2 + phone * 3 + playerY * (1.68 + phone * 1.04),
    z: 16.35 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (2.95 + phone * 4.4),
    lookY: .8 + playerY * (1.02 + phone * 1.26),
    lookZ: -34,
    fov: turbo ? 64 : 56,
    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),
  };
}
