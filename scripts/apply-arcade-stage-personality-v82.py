from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

course = Path("src/sky/arcade/SkyDancerArcadeCoursePath.ts")
text = course.read_text()
anchor = '''  // V7 stage signatures: the course shape itself is now part of each biome's identity.\n'''
insert = '''  // V8.2 route personalities: branch choices should change how the phone moves, not only the palette.\n  if (stage.biome === "cloud") {\n    // Broad, graceful cresting arcs above the cloud sea.\n    x += (Math.sin(u * TAU * 1.18 + 0.46) - Math.sin(0.46)) * 15;\n    y += Math.sin(authoredU * Math.PI) * 11;\n    y += (Math.sin(u * TAU * 1.55 - 0.25) - Math.sin(-0.25)) * 4.5;\n  }\n  if (stage.biome === "storm") {\n    // Thunderhead dodge: nervous lateral reversals and sharp altitude changes.\n    x += (Math.sin(u * TAU * 3.05 + 0.62) - Math.sin(0.62)) * 11.5;\n    x += Math.sin(u * TAU * 6.1) * 3.2;\n    y += (Math.sin(u * TAU * 2.65 - 0.55) - Math.sin(-0.55)) * 9.5;\n  }\n  if (stage.biome === "desert") {\n    // Fortress breach run: long alternating wall approaches with a low, readable flight deck.\n    x += (Math.sin(u * TAU * 1.86 + 0.1) - Math.sin(0.1)) * 21;\n    x += Math.sin(u * TAU * 3.72 + 1.05) * 4.2;\n    y -= Math.sin(authoredU * Math.PI) * 4.8;\n  }\n  if (stage.biome === "ruins") {\n    // Floating labyrinth: weave between islands while climbing and dropping through broken levels.\n    x += (Math.sin(u * TAU * 2.35 + 0.75) - Math.sin(0.75)) * 17;\n    x += Math.sin(u * TAU * 4.7 - 0.2) * 3.5;\n    y += (Math.sin(u * TAU * 1.72 - 0.7) - Math.sin(-0.7)) * 14;\n  }\n  if (stage.biome === "night") {\n    // Neon pursuit: low-altitude, high-frequency metropolitan chicanes.\n    x += (Math.sin(u * TAU * 3.18 + 0.28) - Math.sin(0.28)) * 13.5;\n    x += Math.sin(u * TAU * 6.36) * 2.8;\n    y -= Math.sin(authoredU * Math.PI) * 3.6;\n  }\n  if (stage.biome === "citadel") {\n    // Finale approach: a tightening prism serpent that climbs into the titan arena.\n    const finalRadius = 16 * (1 - authoredU * .48);\n    x += (Math.sin(u * TAU * 2.75 + 0.9) - Math.sin(0.9)) * finalRadius;\n    y += authoredU * 18;\n    y += (Math.sin(u * TAU * 1.65 - 0.4) - Math.sin(-0.4)) * 5.5;\n  }\n\n'''
if anchor not in text:
    raise SystemExit("missing course signature anchor")
course.write_text(text.replace(anchor, insert + anchor, 1))

# The ordinary horizon carrier contradicted the visual direction: keep large carriers for explicit gameplay only.
replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",
    'import { bakeArcadeAirframe, createReferenceCarrier } from "./SkyDancerArcadeReferenceAirframes";',
    'import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";',
    "carrier import",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",
    '  private carrier:THREE.Group|null=null;\n',
    '',
    "carrier field",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.carrier=null;\n',
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;\n',
    "carrier reset",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",
    '''    if(this.carrier){\n      this.carrier.position.y=34+Math.sin(distance*.001)*1.7;\n      this.carrier.rotation.z=Math.sin(distance*.0012)*.024;\n    }\n''',
    '',
    "carrier update",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",
    '''    if(stage.biome==="city" || stage.biome==="cloud" || stage.biome==="storm"){\n      this.carrier=createReferenceCarrier(stage,true);\n      this.carrier.name="arcade-horizon-fleet-carrier";\n      this.carrier.scale.setScalar(stage.biome==="city"?3.8:3.3);\n      this.carrier.position.set(46,34,-195);\n      this.carrier.rotation.y=-.67;\n      group.add(this.carrier);\n    }\n''',
    '',
    "decorative carrier backdrop",
)

# Make Floating Ruins truly multi-level instead of a flat colonnade.
replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",
    '''      case "ruins":{\n        for(const side of [-1,1]){\n          const island=mesh(group,new THREE.ConeGeometry(18,22,9),dark,side*31,-22,0);island.rotation.x=Math.PI;\n          mesh(group,new THREE.CylinderGeometry(18,16,1.1,9),primary,side*31,-10.5,0);\n          for(let i=0;i<4;i++){\n            mesh(group,new THREE.CylinderGeometry(1.1,1.5,17,10),secondary,side*31+(i%2?7:-7),-2,-7+Math.floor(i/2)*14);\n          }\n          mesh(group,new THREE.BoxGeometry(20,1.7,21),primary,side*31,7.3,0);\n          mesh(group,new THREE.BoxGeometry(17,.2,.22),glow,side*31,8.3,-9);\n        }\n        break;\n      }\n''',
    '''      case "ruins":{\n        for(const side of [-1,1]){\n          const tier=((index+(side>0?1:0))%3)-1;\n          const lift=tier*8.5;\n          const island=mesh(group,new THREE.ConeGeometry(18,22,9),dark,side*31,-22+lift,0);island.rotation.x=Math.PI;\n          island.rotation.z=side*tier*.035;\n          mesh(group,new THREE.CylinderGeometry(18,16,1.1,9),primary,side*31,-10.5+lift,0);\n          for(let i=0;i<4;i++){\n            const broken=i===((index+(side>0?2:0))%4);\n            const column=mesh(group,new THREE.CylinderGeometry(1.1,1.5,broken?9:17,10),secondary,side*31+(i%2?7:-7),(broken?-6:-2)+lift,-7+Math.floor(i/2)*14);\n            if(broken) column.rotation.z=side*.18;\n          }\n          mesh(group,new THREE.BoxGeometry(20,1.7,21),primary,side*31,7.3+lift,0);\n          mesh(group,new THREE.BoxGeometry(17,.2,.22),glow,side*31,8.3+lift,-9);\n          const relic=mesh(group,new THREE.TorusGeometry(6.2,.34,6,24,Math.PI*1.35),glow,side*31,15+lift,2);\n          relic.rotation.z=side*(.45+tier*.12);\n        }\n        if(index%2===0){\n          const shard=mesh(group,new THREE.OctahedronGeometry(4.8,0),secondary,0,13+(index%4)*3,15);\n          shard.scale.y=2.1;shard.rotation.z=.38;\n        }\n        break;\n      }\n''',
    "multi-level ruins",
)

# Desert now reads as a fortress breach instead of another rock canyon.
world = Path("src/sky/arcade/SkyDancerArcadeReferenceWorld.ts")
text = world.read_text()
anchor = '''        if(stage.biome==="volcano"){\n          const lava=mesh(group,new THREE.PlaneGeometry(23,114,8,8),glow,0,-25);\n'''
insert = '''        if(stage.biome==="desert" && index%3===1){\n          const gate=index%2===0?9:-9;\n          mesh(group,new THREE.BoxGeometry(50,28,6),dark,gate-42,-11,8);\n          mesh(group,new THREE.BoxGeometry(50,28,6),dark,gate+42,-11,8);\n          mesh(group,new THREE.BoxGeometry(34,4.5,7),secondary,gate,7.2,8);\n          mesh(group,new THREE.BoxGeometry(31,.34,7.2),glow,gate,4.8,7.8);\n          for(const side of [-1,1]) mesh(group,new THREE.BoxGeometry(.3,18,6.4),glow,gate+side*17,-8,8);\n        }\n'''
if anchor not in text:
    raise SystemExit("missing desert/volcano anchor")
world.write_text(text.replace(anchor, insert + anchor, 1))

# Storm structures receive repeated lightning forks so the dark fleet is not just a recolored cloud stage.
text = world.read_text()
old = '''        if(stage.biome==="storm" && index%2===0){\n          const lightning=new THREE.Group();\n          for(let j=0;j<4;j++){\n            const bolt=mesh(lightning,new THREE.CylinderGeometry(.1,.18,8,5),glow,42+j%2*2,26-j*7,-20);\n            bolt.rotation.z=(j%2?1:-1)*.25;\n          }\n          group.add(lightning);\n        }\n'''
new = '''        if(stage.biome==="storm"){\n          const lightning=new THREE.Group();\n          const stormSide=index%2===0?1:-1;\n          for(let j=0;j<6;j++){\n            const bolt=mesh(lightning,new THREE.CylinderGeometry(.11,.2,8.5+j*.7,5),glow,stormSide*(24+(j%3)*7),24-j*6,-39+j*15);\n            bolt.rotation.z=stormSide*(j%2?-.34:.31);\n          }\n          group.add(lightning);\n        }\n'''
if old not in text:
    raise SystemExit("missing storm lightning block")
world.write_text(text.replace(old, new, 1))

# Add a regression contract covering the branch-stage personalities and the no-decorative-carrier rule.
tests = Path("tests/sky-arcade-run.test.ts")
test = tests.read_text()
append = r'''

test("V8.2 branch stages carry independent course signatures and no decorative horizon carrier", async () => {
  const sample = (id: "cloud-fleet" | "storm-carrier" | "desert-fortress" | "floating-ruins" | "night-metro" | "prism-citadel") => {
    const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;
    const length = stage.durationSeconds * stage.courseSpeed;
    return Array.from({ length: 121 }, (_, index) => arcadeCoursePose(stage, length * index / 120));
  };
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const signChanges = (values: number[], epsilon = .03) => {
    const signs = values.filter((value) => Math.abs(value) >= epsilon).map((value) => Math.sign(value));
    return signs.reduce((count, sign, index) => index > 0 && sign !== signs[index - 1] ? count + 1 : count, 0);
  };

  const cloud = sample("cloud-fleet");
  assert.ok(span(cloud.map((pose) => pose.y)) > 25, "cloud stage should crest vertically");
  const storm = sample("storm-carrier");
  assert.ok(signChanges(storm.map((pose) => pose.yaw)) >= 5, "storm should dodge laterally");
  assert.ok(span(storm.map((pose) => pose.y)) > 25, "storm should change altitude sharply");
  const desert = sample("desert-fortress");
  assert.ok(span(desert.map((pose) => pose.x)) > 55, "desert fortress should alternate wall approaches");
  const ruins = sample("floating-ruins");
  assert.ok(span(ruins.map((pose) => pose.x)) > 55, "ruins should weave through islands");
  assert.ok(span(ruins.map((pose) => pose.y)) > 35, "ruins should be a multi-level labyrinth");
  const night = sample("night-metro");
  assert.ok(signChanges(night.map((pose) => pose.yaw)) >= 6, "night metro should chicane repeatedly");
  const citadel = sample("prism-citadel");
  assert.ok(citadel.at(-1)!.y - citadel[0].y > 10, "citadel should climb into the finale");

  const world = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8");
  assert.doesNotMatch(world, /arcade-horizon-fleet-carrier/);
  assert.doesNotMatch(world, /createReferenceCarrier/);
  assert.match(world, /const lift=tier\*8\.5/);
  assert.match(world, /stage\.biome==="desert" && index%3===1/);
  assert.match(world, /const stormSide=index%2===0\?1:-1/);
});
'''
tests.write_text(test + append)

# Remove one-shot implementation harness after a successful patch.
Path("scripts/apply-arcade-stage-personality-v82.py").unlink(missing_ok=True)
Path(".github/workflows/arcade-stage-personality-v82-once.yml").unlink(missing_ok=True)
