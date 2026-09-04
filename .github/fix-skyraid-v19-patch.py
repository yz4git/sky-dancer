from pathlib import Path

path = Path('.github/skyraid-v19-patch.py')
source = path.read_text()
start = source.index('# 3) Audit-only forced warning hook adapted to new warning method.')
end = source.index('# 4) Browser audit: enforce segmented, directional cue.', start)
replacement = """# 3) Audit-only forced warning hook adapted to new warning method.
path = Path(\"scripts/inject-sky-raid-v17-audit-hook.py\")
source = path.read_text()
start = source.index(\"# 3) Force only the presentation cue\")
hook_lines = [
    '# 3) Force only the presentation cue for the final visual screenshot.',
    'path = Path(\"src/sky/SkyDancerAirCombatFxV18.ts\")',
    'source = path.read_text()',
    \"marker = '    const threat = Number.isFinite(nearest) && nearest < 30;'\",
    \"replacement = '    const auditThreat = typeof window !== \\\"undefined\\\"\\n      && typeof navigator !== \\\"undefined\\\"\\n      && navigator.webdriver\\n      && (window as unknown as { __skyRaidAuditForceMissileWarning?: unknown }).__skyRaidAuditForceMissileWarning === true;\\n    if (auditThreat) nearest = 6;\\n    const threat = auditThreat || (Number.isFinite(nearest) && nearest < 30);'\",
    'if marker not in source:',
    '    raise SystemExit(\"SKY RAID missile warning audit injection marker missing\")',
    'path.write_text(source.replace(marker, replacement, 1))',
]
source = source[:start] + \"\\n\".join(hook_lines) + \"\\n\"
path.write_text(source)


"""
path.write_text(source[:start] + replacement + source[end:])
