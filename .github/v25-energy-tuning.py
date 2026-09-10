from pathlib import Path
p = Path('src/sky/arcade/SkyDancerArcadeV25CoordinatedFlight.ts')
s = p.read_text()
repls = {
'energyRecovery: .34, turnEnergyCost: .115, climbEnergyCost: .09':'energyRecovery: .26, turnEnergyCost: .145, climbEnergyCost: .105',
'energyRecovery: .36, turnEnergyCost: .105, climbEnergyCost: .082':'energyRecovery: .27, turnEnergyCost: .135, climbEnergyCost: .1',
'energyRecovery: .33, turnEnergyCost: .11, climbEnergyCost: .086':'energyRecovery: .25, turnEnergyCost: .14, climbEnergyCost: .103',
'energyRecovery: .4, turnEnergyCost: .092, climbEnergyCost: .076':'energyRecovery: .31, turnEnergyCost: .125, climbEnergyCost: .094',
'energyRecovery: .3, turnEnergyCost: .112, climbEnergyCost: .088':'energyRecovery: .23, turnEnergyCost: .145, climbEnergyCost: .108',
'energyRecovery: .32, turnEnergyCost: .108, climbEnergyCost: .085':'energyRecovery: .21, turnEnergyCost: .15, climbEnergyCost: .11',
'energyRecovery: .23, turnEnergyCost: .132, climbEnergyCost: .108':'energyRecovery: .18, turnEnergyCost: .155, climbEnergyCost: .12',
'energyRecovery: .2, turnEnergyCost: .142, climbEnergyCost: .115':'energyRecovery: .16, turnEnergyCost: .165, climbEnergyCost: .13',
'energyRecovery: .18, turnEnergyCost: .15, climbEnergyCost: .12':'energyRecovery: .14, turnEnergyCost: .175, climbEnergyCost: .138',
'energyRecovery: .19, turnEnergyCost: .148, climbEnergyCost: .118':'energyRecovery: .15, turnEnergyCost: .17, climbEnergyCost: .135',
}
for old,new in repls.items():
    if old not in s: raise SystemExit(f'missing profile fragment: {old}')
    s=s.replace(old,new,1)
old='''  const descentRecovery = Math.max(0, -pitchNorm) * control.energyRecovery * .42;
  const load = turnLoad * control.turnEnergyCost + climbLoad * control.climbEnergyCost;
  const recovery = control.energyRecovery * (1.015 - energy) + descentRecovery;
  const nextEnergy = clamp(energy + (recovery - load) * dt, .58, 1.06);'''
new='''  const descentRecovery = Math.max(0, -pitchNorm) * control.energyRecovery * .46;
  const load = turnLoad * control.turnEnergyCost + climbLoad * control.climbEnergyCost;
  // V25.1: an aircraft cannot fully recover energy while it is still pulling hard. Recovery belongs
  // to the unload/descent phase, leaving a readable speed consequence after a sustained turn.
  const aerodynamicLoad = Math.max(turnLoad, climbLoad * .85);
  const unloadedRecovery = control.energyRecovery
    * Math.max(0, 1.025 - energy)
    * Math.max(.08, 1 - aerodynamicLoad * .88);
  const recovery = unloadedRecovery + descentRecovery;
  const nextEnergy = clamp(energy + (recovery - load) * dt, .58, 1.06);'''
if old not in s: raise SystemExit('missing energy formula')
s=s.replace(old,new,1)
p.write_text(s)
