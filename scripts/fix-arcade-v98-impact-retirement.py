from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
text = path.read_text()

old = '''  private enemies: ArcadeEnemy[] = [];
  private projectiles: ArcadeProjectile[] = [];
  private impactEvents: SkyDancerArcadeImpactSnapshot[] = [];
  private hazards: ArcadeHazard[] = [];
'''
new = '''  private enemies: ArcadeEnemy[] = [];
  private projectiles: ArcadeProjectile[] = [];
  private impactEvents: SkyDancerArcadeImpactSnapshot[] = [];
  private readonly impactEventAges = new Map<number, number>();
  private hazards: ArcadeHazard[] = [];
'''
assert old in text
text = text.replace(old, new, 1)

old = '''    this.enemies = [];
    this.projectiles = [];
    this.impactEvents = [];
    this.hazards = [];
'''
new = '''    this.enemies = [];
    this.projectiles = [];
    this.impactEvents = [];
    this.impactEventAges.clear();
    this.hazards = [];
'''
assert old in text
text = text.replace(old, new, 1)

old = '''    this.impactEvents.push({
      serial: this.hitSerial,
      enemyId: enemy.id,
      kind: enemy.kind,
      x: enemy.x,
      y: enemy.y,
      depth: enemy.depth,
      hpBefore,
      hpAfter: enemy.hp,
      maxHp: enemy.maxHp,
      boss: enemy.boss,
      missile,
      destroyed,
    });
    if (this.impactEvents.length > 16) this.impactEvents.splice(0, this.impactEvents.length - 16);
'''
new = '''    this.impactEvents.push({
      serial: this.hitSerial,
      enemyId: enemy.id,
      kind: enemy.kind,
      x: enemy.x,
      y: enemy.y,
      depth: enemy.depth,
      hpBefore,
      hpAfter: enemy.hp,
      maxHp: enemy.maxHp,
      boss: enemy.boss,
      missile,
      destroyed,
    });
    this.impactEventAges.set(this.hitSerial, 0);
    if (this.impactEvents.length > 16) {
      const retired = this.impactEvents.splice(0, this.impactEvents.length - 16);
      for (const impact of retired) this.impactEventAges.delete(impact.serial);
    }
'''
assert old in text
text = text.replace(old, new, 1)

old = '''  step(deltaSeconds: number): void {
    const delta = clamp(deltaSeconds, 0, 0.05);
    if (this.status === "paused" || this.status === "continue" || this.status === "game-over" || this.status === "run-clear" || this.status === "practice-clear") return;
'''
new = '''  step(deltaSeconds: number): void {
    const delta = clamp(deltaSeconds, 0, 0.05);
    // Impact telemetry is presentation mail, not gameplay state. Keep it long enough for a render frame,
    // then retire it even while stage-clear/paused so long sessions never retain combat history.
    if (this.impactEvents.length > 0) {
      const active: SkyDancerArcadeImpactSnapshot[] = [];
      for (const impact of this.impactEvents) {
        const age = (this.impactEventAges.get(impact.serial) ?? 0) + delta;
        if (age <= .6) {
          this.impactEventAges.set(impact.serial, age);
          active.push(impact);
        } else {
          this.impactEventAges.delete(impact.serial);
        }
      }
      this.impactEvents = active;
    }
    if (this.status === "paused" || this.status === "continue" || this.status === "game-over" || this.status === "run-clear" || this.status === "practice-clear") return;
'''
assert old in text
text = text.replace(old, new, 1)

path.write_text(text)
print("Applied V9.8 transient impact-event retirement")
