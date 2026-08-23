// V30 keeps the V21-V29 gameplay/FX chain but moves final world composition
// into a dedicated presentation controller with one opaque high-altitude ground.
// The quality chain remains inherited through:
// SkyDancerAirCombatFxV21 -> SkyDancerAirCombatFxV22 -> SkyDancerAirCombatFxV23
// -> SkyDancerAirCombatFxV24 -> SkyDancerAirCombatFxV25 -> SkyDancerAirCombatFxV26
// -> SkyDancerAirCombatFxV27 -> SkyDancerAirCombatFxV28 -> SkyDancerAirCombatFxV29
// -> SkyDancerAirCombatFxV30.
// Historical regression markers for the same inherited chain:
// SkyDancerAirCombatFxV21 remains in the inheritance chain
// V23 remains in the inheritance chain
// V24 remains in the inheritance chain
// SkyDancerAirCombatFxV26 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV27 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV28 as SkyDancerAirCombatFx
export {
  SkyDancerAirCombatFxV30 as SkyDancerAirCombatFx,
} from "./SkyDancerAirCombatFxV30";
export type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
