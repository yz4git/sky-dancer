/** Wide-field chase camera: the player can traverse about two previous view-widths/heights while the camera follows without pinning the craft to screen center. */
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  return {
    x: playerX * (6.35 + phone * 1.35),
    y: 5.2 + phone * 3 + playerY * 2.72,
    z: 16.2 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (5.55 + phone * 1.8),
    lookY: .8 + playerY * 2.28,
    lookZ: -34,
    fov: turbo ? 64 : 56,
    roll: Math.max(-.065, Math.min(.065, -playerX * .026)),
  };
}
