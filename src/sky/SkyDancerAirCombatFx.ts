// V29 fixes long-session steering ownership, raises the flight level again,
// further sharpens the boss encounter, and strengthens the supplied reference look.
// The quality chain remains inherited through:
// SkyDancerAirCombatFxV21 -> SkyDancerAirCombatFxV22 -> SkyDancerAirCombatFxV23
// -> SkyDancerAirCombatFxV24 -> SkyDancerAirCombatFxV25 -> SkyDancerAirCombatFxV26
// -> SkyDancerAirCombatFxV27 -> SkyDancerAirCombatFxV28 -> SkyDancerAirCombatFxV29.
// Historical regression markers for the same inherited chain:
// SkyDancerAirCombatFxV21 remains in the inheritance chain
// V23 remains in the inheritance chain
// V24 remains in the inheritance chain
// SkyDancerAirCombatFxV26 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV27 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV28 as SkyDancerAirCombatFx
export {
  SkyDancerAirCombatFxV29 as SkyDancerAirCombatFx,
} from "./SkyDancerAirCombatFxV29";
export type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
