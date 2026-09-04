// SKY RAID flight remains unchanged; this source touch intentionally triggers
// production CI, Pages and the real-browser combat audit after the high-input
// steering cap was applied to the dedicated SKY RAID input path.
export const SKY_RAID_MIN_ALTITUDE = 20;
export const SKY_RAID_MAX_ALTITUDE = 64;
export const SKY_RAID_MAX_BANK = 0.78;
export const SKY_RAID_MAX_PITCH = 0.42;

export interface SkyDancerSkyRaidFlightSnapshot {
  altitude: number;
  verticalSpeed: number;
  bank: number;
  pitch: number;
  turnRate: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function damp(current: number, target: number, response: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, response) * Math.max(0, delta)));
}

export function skyRaidHeadingDelta(current: number, previous: number): number {
  let delta = current - previous;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function skyRaidBankTarget(turnRate: number, steer: number): number {
  return clamp(-turnRate * 0.31 - steer * 0.12, -SKY_RAID_MAX_BANK, SKY_RAID_MAX_BANK);
}

export function skyRaidPitchTarget(verticalSpeed: number, verticalInput: number, maxVerticalSpeed: number): number {
  const velocityPitch = maxVerticalSpeed > 0 ? -(verticalSpeed / maxVerticalSpeed) * 0.34 : 0;
  return clamp(velocityPitch - verticalInput * 0.06, -SKY_RAID_MAX_PITCH, SKY_RAID_MAX_PITCH);
}

export class SkyDancerSkyRaidFlightController {
  private verticalInput = 0;
  private altitude = SKY_RAID_MIN_ALTITUDE;
  private verticalSpeed = 0;
  private bank = 0;
  private pitch = 0;
  private previousHeading: number | null = null;

  setVerticalInput(value: number): void {
    this.verticalInput = clamp(value, -1, 1);
  }

  reset(): void {
    this.verticalInput = 0;
    this.altitude = SKY_RAID_MIN_ALTITUDE;
    this.verticalSpeed = 0;
    this.bank = 0;
    this.pitch = 0;
    this.previousHeading = null;
  }

  step(delta: number, heading: number, steer: number, boost: boolean): SkyDancerSkyRaidFlightSnapshot {
    const dt = clamp(delta, 0, 0.05);
    const maxVerticalSpeed = boost ? 22 : 16;
    const targetVerticalSpeed = this.verticalInput * maxVerticalSpeed;
    this.verticalSpeed = damp(this.verticalSpeed, targetVerticalSpeed, this.verticalInput === 0 ? 4.4 : 7.0, dt);
    if (Math.abs(this.verticalInput) < 0.02) this.verticalSpeed *= Math.exp(-1.3 * dt);
    this.altitude = clamp(this.altitude + this.verticalSpeed * dt, SKY_RAID_MIN_ALTITUDE, SKY_RAID_MAX_ALTITUDE);
    if ((this.altitude <= SKY_RAID_MIN_ALTITUDE && this.verticalSpeed < 0) || (this.altitude >= SKY_RAID_MAX_ALTITUDE && this.verticalSpeed > 0)) this.verticalSpeed = 0;

    let turnRate = 0;
    if (this.previousHeading !== null && dt > 0.0001) {
      turnRate = clamp(skyRaidHeadingDelta(heading, this.previousHeading) / dt, -3.0, 3.0);
    }
    this.previousHeading = heading;
    const targetBank = skyRaidBankTarget(turnRate, steer);
    const bankResponse = Math.abs(targetBank) > Math.abs(this.bank) ? 7.8 : 4.2;
    this.bank = damp(this.bank, targetBank, bankResponse, dt);
    const targetPitch = skyRaidPitchTarget(this.verticalSpeed, this.verticalInput, maxVerticalSpeed);
    this.pitch = damp(this.pitch, targetPitch, 6.2, dt);

    return { altitude: this.altitude, verticalSpeed: this.verticalSpeed, bank: this.bank, pitch: this.pitch, turnRate };
  }
}
