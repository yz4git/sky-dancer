from pathlib import Path
p=Path('src/sky/arcade/SkyDancerArcadeV25CoordinatedFlight.ts')
s=p.read_text()
old='  const load = turnLoad * control.turnEnergyCost + climbLoad * control.climbEnergyCost;'
new='  const load = (turnLoad * control.turnEnergyCost + climbLoad * control.climbEnergyCost) * 1.55;'
if old not in s: raise SystemExit('load formula not found')
s=s.replace(old,new,1)
p.write_text(s)
