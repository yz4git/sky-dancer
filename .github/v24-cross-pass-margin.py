from pathlib import Path
p=Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
s=p.read_text()
s=s.replace('verticalLane * separationLead * .78', 'verticalLane * separationLead * .88', 1)
s=s.replace('verticalLane * (1.08 + Math.sin(t * Math.PI) * .22)', 'verticalLane * (1.16 + Math.sin(t * Math.PI) * .24)', 1)
p.write_text(s)
