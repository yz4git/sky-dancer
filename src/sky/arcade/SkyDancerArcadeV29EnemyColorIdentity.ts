import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";

export interface SkyDancerArcadeV29EnemyColorIdentity {
  body: number;
  secondary: number;
  glow: number;
  role: "fighter" | "interceptor" | "missile" | "bomber" | "ace" | "drone" | "striker" | "gunship" | "raider";
}

/**
 * V29 enemy role colors are deliberately semantic rather than stage-global.
 * The airframe still receives a small amount of stage palette blending in the renderer,
 * but a player should be able to identify a threat class from color before reading its silhouette.
 */
export function skyDancerArcadeV29EnemyColorIdentity(
  kind: SkyDancerArcadeEnemyKind,
): SkyDancerArcadeV29EnemyColorIdentity {
  switch (kind) {
    case "fighter":
      return { body: 0xd94c4c, secondary: 0xff9274, glow: 0xff5f48, role: "fighter" };
    case "interceptor":
      return { body: 0xd88a26, secondary: 0xffd166, glow: 0xffbf47, role: "interceptor" };
    case "missile-boat":
      return { body: 0x287fbd, secondary: 0x66d9ff, glow: 0x4fc7ff, role: "missile" };
    case "bomber":
      return { body: 0x4e68bd, secondary: 0x93a7ff, glow: 0x718cff, role: "bomber" };
    case "ace":
      return { body: 0xd9dce8, secondary: 0xffd76a, glow: 0xeaf6ff, role: "ace" };
    case "drone":
      return { body: 0x2fa568, secondary: 0x7ce8a8, glow: 0x4fe68e, role: "drone" };
    case "striker":
      return { body: 0xd55c2f, secondary: 0xffad62, glow: 0xff7a45, role: "striker" };
    case "gunship":
      return { body: 0x7352b8, secondary: 0xb397ff, glow: 0x9a79ff, role: "gunship" };
    case "raider":
      return { body: 0xb94886, secondary: 0xf783bd, glow: 0xff63b5, role: "raider" };
  }
}
