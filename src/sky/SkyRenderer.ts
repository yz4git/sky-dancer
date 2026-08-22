import type { SkyDemoHandle } from "./SkyDemo";

export function createSkyRenderer(
  forceCanvas: boolean,
  webglAvailable: boolean,
  createWebGL: () => SkyDemoHandle,
  createCanvas: () => SkyDemoHandle,
  onWebGLFailure: (error: unknown) => void,
): SkyDemoHandle {
  if (forceCanvas || !webglAvailable) return createCanvas();
  try {
    return createWebGL();
  } catch (error) {
    onWebGLFailure(error);
    return createCanvas();
  }
}
