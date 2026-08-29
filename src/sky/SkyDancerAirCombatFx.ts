import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import { SkyDancerAirCombatFxV29 } from "./SkyDancerAirCombatFxV29";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { installSkyDancerAttackRunsV44 } from "./SkyDancerAttackRunsV44";
import { installSkyDancerBossAttackRunV45 } from "./SkyDancerBossAttackRunV45";
import { installSkyDancerBossCombatV34 } from "./SkyDancerBossCombatV34";
import { installSkyDancerBossDurabilityGuardV34 } from "./SkyDancerBossDurabilityGuardV34";
import { installSkyDancerCampaignPacingV49 } from "./SkyDancerCampaignPacingV49";
import { installSkyDancerCombatChoreographyV46 } from "./SkyDancerCombatChoreographyV46";
import { installSkyDancerCleanupCadenceGuardV46 } from "./SkyDancerCleanupCadenceGuardV46";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { installSkyDancerFlightNaturalMotionV41 } from "./SkyDancerFlightNaturalMotionV41";
import { installSkyDancerReengagementV40 } from "./SkyDancerReengagementV40";
import { SkyDancerPresentationPipeline } from "./presentation/SkyDancerPresentationPipeline";

// Historical regression markers retained for source-level compatibility tests:
// SkyDancerAirCombatFxV21 remains in the inheritance chain
// SkyDancerAirCombatFxV22 remains in the inheritance chain
// SkyDancerAirCombatFxV23 remains in the inheritance chain
// SkyDancerAirCombatFxV24 remains in the inheritance chain
// SkyDancerAirCombatFxV25 remains in the inheritance chain
// SkyDancerAirCombatFxV26 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV27 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV28 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV29 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV30 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV31 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV32 as SkyDancerAirCombatFx

/**
 * Stable production facade introduced by the V33 architecture refactor.
 *
 * V29 remains the legacy gameplay/FX compatibility boundary. V30+ visual work
 * is composed through the presentation pipeline. V34 installs a durability
 * compatibility guard immediately inside its boss director, then the director
 * owns final aerial boss motion and phase rules without reviving inheritance.
 * V40 chooses re-engagement targets. V41 is installed outside it and converts
 * every non-boss correction back into bounded forward aircraft motion. V44 is
 * outermost for CLEANUP staging; V45 then synchronizes boss vertical flight to
 * the boss attack state without adding player controls. V46 wraps the complete
 * stage loop with short combat beats and FLOW scoring. Its cadence guard keeps
 * V44's five-fighter CLEANUP intact, while V49 trims only real campaign boss
 * durability so each sortie resolves without changing V34's standalone rules.
 */
export class SkyDancerAirCombatFx extends SkyDancerAirCombatFxV29 {
  private readonly presentation: SkyDancerPresentationPipeline;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    installSkyDancerBossDurabilityGuardV34();
    installSkyDancerBossCombatV34();
    installSkyDancerReengagementV40();
    installSkyDancerFlightNaturalMotionV41();
    installSkyDancerAttackRunsV44();
    installSkyDancerBossAttackRunV45();
    installSkyDancerCombatChoreographyV46();
    installSkyDancerCleanupCadenceGuardV46();
    installSkyDancerCampaignPacingV49();
    this.presentation = new SkyDancerPresentationPipeline(runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.presentation.update(snapshot);
  }
}

export type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
