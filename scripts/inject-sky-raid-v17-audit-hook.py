from pathlib import Path

# 1) Deterministic altitude stops for camera framing checks.
path = Path("src/sky/SkyDancerSkyRaidFlight.ts")
source = path.read_text()
marker = """    if ((this.altitude <= SKY_RAID_MIN_ALTITUDE && this.verticalSpeed < 0) || (this.altitude >= SKY_RAID_MAX_ALTITUDE && this.verticalSpeed > 0)) this.verticalSpeed = 0;\n\n    let turnRate = 0;"""
replacement = """    if ((this.altitude <= SKY_RAID_MIN_ALTITUDE && this.verticalSpeed < 0) || (this.altitude >= SKY_RAID_MAX_ALTITUDE && this.verticalSpeed > 0)) this.verticalSpeed = 0;\n\n    // Webdriver-only deterministic edge positioning for visual audit builds.\n    // This code is injected after checkout and is never committed to product source.\n    if (typeof window !== \"undefined\" && typeof navigator !== \"undefined\" && navigator.webdriver) {\n      const forcedAltitude = (window as unknown as { __skyRaidAuditForcedAltitude?: unknown }).__skyRaidAuditForcedAltitude;\n      if (typeof forcedAltitude === \"number\" && Number.isFinite(forcedAltitude)) {\n        this.altitude = clamp(forcedAltitude, SKY_RAID_MIN_ALTITUDE, SKY_RAID_MAX_ALTITUDE);\n      }\n    }\n\n    let turnRate = 0;"""
if marker not in source:
    raise SystemExit("SKY RAID flight audit injection marker missing")
path.write_text(source.replace(marker, replacement, 1))

# 2) Keep product timing rules untouched, but allow the browser audit to open a
# real STRIKER counter window on demand. The missile still launches, guides,
# performs swept collision, kills the live enemy, and must propagate through
# Hunt -> SKY RAID score/chain/UI exactly like production.
path = Path("src/sky/SkyDancerCombatDecisionV45.ts")
source = path.read_text()
marker = """  if (enemy.archetype === \"striker\") {\n    const vulnerable = tacticalPhase === 2;"""
replacement = """  if (enemy.archetype === \"striker\") {\n    const auditCounterWindow = typeof window !== \"undefined\"\n      && typeof navigator !== \"undefined\"\n      && navigator.webdriver\n      && (window as unknown as { __skyRaidAuditForceVulnerable?: unknown }).__skyRaidAuditForceVulnerable === true;\n    const vulnerable = tacticalPhase === 2 || auditCounterWindow;"""
if marker not in source:
    raise SystemExit("SKY RAID combat decision audit injection marker missing")
path.write_text(source.replace(marker, replacement, 1))

# 3) Force only the presentation cue for the final visual screenshot. The
# production threat calculation and geometry remain unchanged in committed
# source; this injected flag lets the audit inspect the exact live warning halo
# without waiting for randomized enemy missile scheduling.
path = Path("src/sky/SkyDancerAirCombatFxV18.ts")
source = path.read_text()
marker = """    let nearest = Number.POSITIVE_INFINITY;\n    for (const missile of missiles.missiles) nearest = Math.min(nearest, missile.distanceToPlayer);\n    const threat = Number.isFinite(nearest) && nearest < 30;"""
replacement = """    let nearest = Number.POSITIVE_INFINITY;\n    for (const missile of missiles.missiles) nearest = Math.min(nearest, missile.distanceToPlayer);\n    const auditThreat = typeof window !== \"undefined\"\n      && typeof navigator !== \"undefined\"\n      && navigator.webdriver\n      && (window as unknown as { __skyRaidAuditForceMissileWarning?: unknown }).__skyRaidAuditForceMissileWarning === true;\n    if (auditThreat) nearest = 6;\n    const threat = auditThreat || (Number.isFinite(nearest) && nearest < 30);"""
if marker not in source:
    raise SystemExit("SKY RAID missile warning audit injection marker missing")
path.write_text(source.replace(marker, replacement, 1))
