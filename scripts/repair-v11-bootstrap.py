from pathlib import Path
p=Path('scripts/apply-arcade-v11.py')
s=p.read_text()
s=s.replace('b("tower-slalom", "SKYLINE SLALOM", .12, .30, "setpiece", "TOWER SLALOM", .62, .90, .76, 1.0, .7, 700, ["line","cross"], ["fighter","interceptor"], ["cross-pass","close-bank"], "tower"),','b("tower-slalom", "SKYLINE SLALOM", .12, .30, "setpiece", "TOWER SLALOM", .62, .90, .76, 1.0, .7, 700, ["line","cross"], ["fighter","interceptor"], ["cross-pass","parallel","close-bank"], "tower"),')
s=s.replace('''    const baseCap = this.options.difficulty === "hard" ? 15 : 11;\\n    const enemyCap = Math.min(17, baseCap + Math.round(beat.intensity * 2));\\n''','''    // Keep the proven V6.2 readability ceiling; V11 changes cadence/composition, not simultaneous clutter.\\n    const enemyCap = this.options.difficulty === "hard" ? 15 : 11;\\n''')
if 'const baseCap = this.options.difficulty' in s:
    raise SystemExit('enemy cap repair did not apply')
if '["cross-pass","parallel","close-bank"]' not in s:
    raise SystemExit('parallel choreography repair did not apply')
p.write_text(s)
print('V11 bootstrap repaired')
