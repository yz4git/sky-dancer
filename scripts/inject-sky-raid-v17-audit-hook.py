from pathlib import Path

path = Path("src/sky/SkyDancerSkyRaidFlight.ts")
source = path.read_text()
marker = """    if ((this.altitude <= SKY_RAID_MIN_ALTITUDE && this.verticalSpeed < 0) || (this.altitude >= SKY_RAID_MAX_ALTITUDE && this.verticalSpeed > 0)) this.verticalSpeed = 0;\n\n    let turnRate = 0;"""
replacement = """    if ((this.altitude <= SKY_RAID_MIN_ALTITUDE && this.verticalSpeed < 0) || (this.altitude >= SKY_RAID_MAX_ALTITUDE && this.verticalSpeed > 0)) this.verticalSpeed = 0;\n\n    // Webdriver-only deterministic edge positioning for visual audit builds.\n    // This code is injected after checkout and is never committed to product source.\n    if (typeof window !== \"undefined\" && typeof navigator !== \"undefined\" && navigator.webdriver) {\n      const forcedAltitude = (window as unknown as { __skyRaidAuditForcedAltitude?: unknown }).__skyRaidAuditForcedAltitude;\n      if (typeof forcedAltitude === \"number\" && Number.isFinite(forcedAltitude)) {\n        this.altitude = clamp(forcedAltitude, SKY_RAID_MIN_ALTITUDE, SKY_RAID_MAX_ALTITUDE);\n      }\n    }\n\n    let turnRate = 0;"""
if marker not in source:
    raise SystemExit("SKY RAID flight audit injection marker missing")
path.write_text(source.replace(marker, replacement, 1))
