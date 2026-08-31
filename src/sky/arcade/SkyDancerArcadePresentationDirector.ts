export interface SkyDancerArcadePresentationSignals {
  turboActive: boolean;
  nearMisses: number;
  enemiesDefeated: number;
  bossActive: boolean;
  hitSerial: number;
  damageSerial: number;
  stageSerial: number;
  resultSerial: number;
}

export interface SkyDancerArcadePresentationFrame {
  rush: number;
  turboKick: number;
  nearMiss: number;
  impact: number;
  damage: number;
  kill: number;
  boss: number;
  transition: number;
  fovKick: number;
  cameraShake: number;
  pullback: number;
  bloomBoost: number;
  exposureBoost: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const decay = (value: number, delta: number, speed: number) => Math.max(0, value - delta * speed);

/**
 * V9.5 Presentation Overdrive.
 * Converts discrete runtime events into short, overlapping cinematic envelopes without
 * changing hitboxes, movement, enemy logic, scoring, or timing authority.
 */
export class SkyDancerArcadePresentationDirector {
  private turboKick = 0;
  private nearMiss = 0;
  private impact = 0;
  private damage = 0;
  private kill = 0;
  private boss = 0;
  private transition = 0;
  private rush = 0;

  reset(): void {
    this.turboKick = 0;
    this.nearMiss = 0;
    this.impact = 0;
    this.damage = 0;
    this.kill = 0;
    this.boss = 0;
    this.transition = 0;
    this.rush = 0;
  }

  update(
    current: SkyDancerArcadePresentationSignals,
    previous: SkyDancerArcadePresentationSignals,
    delta: number,
  ): SkyDancerArcadePresentationFrame {
    const dt = Math.max(0, Math.min(.1, delta));
    if (current.turboActive && !previous.turboActive) this.turboKick = 1;
    if (current.nearMisses > previous.nearMisses) this.nearMiss = 1;
    if (current.hitSerial !== previous.hitSerial) this.impact = Math.max(this.impact, .72);
    if (current.damageSerial !== previous.damageSerial) this.damage = 1;
    if (current.enemiesDefeated > previous.enemiesDefeated) this.kill = 1;
    if (current.bossActive && !previous.bossActive) this.boss = 1;
    if (current.stageSerial !== previous.stageSerial) this.transition = 1;
    if (current.resultSerial !== previous.resultSerial) this.transition = Math.max(this.transition, .72);

    const rushTarget = current.turboActive ? 1 : 0;
    const response = 1 - Math.exp(-dt * (rushTarget > this.rush ? 8.5 : 4.4));
    this.rush += (rushTarget - this.rush) * response;

    const turboKick = this.turboKick;
    const nearMiss = this.nearMiss;
    const impact = this.impact;
    const damage = this.damage;
    const kill = this.kill;
    const boss = this.boss;
    const transition = this.transition;
    const rush = clamp01(this.rush + turboKick * .24 + nearMiss * .12 + kill * .08);

    const frame: SkyDancerArcadePresentationFrame = {
      rush,
      turboKick,
      nearMiss,
      impact,
      damage,
      kill,
      boss,
      transition,
      fovKick: turboKick * 5.2 + nearMiss * 2.1 + kill * 1.25 + boss * 1.5,
      cameraShake: nearMiss * .12 + impact * .045 + damage * .22 + kill * .07 + boss * .085,
      pullback: turboKick * .7 + boss * .5 + transition * .35,
      bloomBoost: rush * .09 + impact * .07 + kill * .11 + boss * .08 + transition * .07,
      exposureBoost: turboKick * .04 + impact * .035 + kill * .055 + transition * .045,
    };

    this.turboKick = decay(this.turboKick, dt, 3.8);
    this.nearMiss = decay(this.nearMiss, dt, 4.8);
    this.impact = decay(this.impact, dt, 7.2);
    this.damage = decay(this.damage, dt, 3.9);
    this.kill = decay(this.kill, dt, 3.35);
    this.boss = decay(this.boss, dt, 1.55);
    this.transition = decay(this.transition, dt, 2.25);
    return frame;
  }
}
