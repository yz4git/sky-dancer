from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/sky/arcade/SkyDancerArcadeV11Setpieces.ts"
TEST = ROOT / "tests/sky-arcade-v4025-signature-setpiece-naturalization.test.ts"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


source = TARGET.read_text(encoding="utf-8")

old_canyon = '''    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-canyon-knife-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "knife-floor";
      const squeeze = index % 3 === 1 ? 2 : 0;
      box(section, [14, 30, 28], rock, [-24 + squeeze, -4, 0]);
      box(section, [14, 26, 28], rock, [24 - squeeze, -6, 0]);
      box(section, [.22, 16, 28.4], light, [-16.8 + squeeze, -1, 0]);
      box(section, [.22, 16, 28.4], light, [16.8 - squeeze, -1, 0]);
      this.addAnchor(section, .145 + index * .019, ["knife-floor"]);
    }'''
new_canyon = '''    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-canyon-knife-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "knife-floor";
      section.userData.arcadeV4025NaturalSignature = "canyon-rock-corridor";
      const squeeze = index % 3 === 1 ? 1.5 : 0;
      // V40.25: the old 30m BoxGeometry walls filled the phone view as black/yellow boards.
      // Build a broken canyon edge from multiple faceted masses instead; the World Break runtime
      // still owns challenge timing/gates, so this remains a presentation-only replacement.
      for (const side of [-1, 1]) {
        const sideSign = side as -1 | 1;
        const baseX = sideSign * (34 - squeeze);
        for (let rockIndex = 0; rockIndex < 3; rockIndex += 1) {
          const mass = new THREE.Mesh(
            new THREE.IcosahedronGeometry(5.2 - rockIndex * .55, 1),
            rockIndex === 1 ? dark : rock,
          );
          mass.position.set(
            baseX + sideSign * (rockIndex * 4.9 + (index % 2) * 1.2),
            -9 + rockIndex * 6.2 + ((index + rockIndex) % 2) * 2.4,
            (rockIndex - 1) * 7 + (index % 2 ? 2 : -2),
          );
          mass.scale.set(1.25 + rockIndex * .08, 1.55 - rockIndex * .12, 1.15 + (rockIndex % 2) * .14);
          mass.rotation.set(.08 * rockIndex, sideSign * (.12 + rockIndex * .09), sideSign * (.08 + rockIndex * .07));
          section.add(mass);
        }
        const vein = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), light);
        vein.position.set(sideSign * (28.5 - squeeze), 3 + (index % 2) * 2.2, -2);
        vein.scale.set(.58, 2.1, .58);
        vein.rotation.z = sideSign * .46;
        section.add(vein);
      }
      this.addAnchor(section, .145 + index * .019, ["knife-floor"]);
    }'''
source = replace_once(source, old_canyon, new_canyon, "Red Canyon knife-floor")

old_volcano = '''    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-magma-rift-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "lava-trench";
      box(section, [13, 24, 28], basalt, [-24, -4, 0]);
      box(section, [13, 24, 28], basalt, [24, -4, 0]);
      box(section, [.4, 12, 28.5], lava, [-17.3, -6, 0]);
      box(section, [.4, 12, 28.5], lava, [17.3, -6, 0]);
      this.addAnchor(section, .145 + index * .019, ["magma-rift"]);
    }'''
new_volcano = '''    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v13-magma-rift-${index}`;
      section.userData.arcadeV13SetpieceIdentity = "lava-trench";
      section.userData.arcadeV4025NaturalSignature = "basalt-rift-corridor";
      // V40.25: replace the old paired 24m box walls with irregular basalt shoulders.
      for (const side of [-1, 1]) {
        const sideSign = side as -1 | 1;
        const baseX = sideSign * (35 + (index % 2) * 2);
        for (let rockIndex = 0; rockIndex < 3; rockIndex += 1) {
          const mass = new THREE.Mesh(
            new THREE.DodecahedronGeometry(5.1 - rockIndex * .5, 1),
            rockIndex === 1 ? crust : basalt,
          );
          mass.position.set(
            baseX + sideSign * rockIndex * 5.1,
            -10 + rockIndex * 5.6 + ((index + rockIndex) % 2) * 1.8,
            (rockIndex - 1) * 6.2,
          );
          mass.scale.set(1.32 + rockIndex * .06, 1.42 - rockIndex * .1, 1.18 + (rockIndex % 2) * .12);
          mass.rotation.set(.06 * rockIndex, sideSign * (.1 + rockIndex * .1), sideSign * (.06 + rockIndex * .08));
          section.add(mass);
        }
        const fissure = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), lava);
        fissure.position.set(sideSign * (29 + (index % 2)), -1 + (index % 3), -1.5);
        fissure.scale.set(.52, 2.5, .52);
        fissure.rotation.z = sideSign * .38;
        section.add(fissure);
      }
      this.addAnchor(section, .145 + index * .019, ["magma-rift"]);
    }'''
source = replace_once(source, old_volcano, new_volcano, "Volcano magma-rift")
TARGET.write_text(source, encoding="utf-8")

TEST.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeV11SetpieceDirector } from "../src/sky/arcade/SkyDancerArcadeV11Setpieces";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function groups(scene: THREE.Scene, prefix: string): THREE.Group[] {
  const result: THREE.Group[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Group && object.name.startsWith(prefix)) result.push(object);
  });
  return result;
}

function meshGeometryTypes(root: THREE.Object3D): string[] {
  const types: string[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) types.push(object.geometry.type);
  });
  return types;
}

test("V40.25 Red Canyon knife-floor has seven natural rock signatures and no box walls", () => {
  const scene = new THREE.Scene();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(stage("red-canyon"));
  const sections = groups(scene, "arcade-v13-canyon-knife-");
  assert.equal(sections.length, 7);
  assert.ok(sections.every((section) => section.userData.arcadeV4025NaturalSignature === "canyon-rock-corridor"));
  assert.ok(sections.every((section) => !meshGeometryTypes(section).includes("BoxGeometry")));
  assert.ok(sections.every((section) => meshGeometryTypes(section).includes("IcosahedronGeometry")));
  director.dispose();
});

test("V40.25 Volcano magma-rift has seven basalt signatures and no box walls", () => {
  const scene = new THREE.Scene();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(stage("volcano-core"));
  const sections = groups(scene, "arcade-v13-magma-rift-");
  assert.equal(sections.length, 7);
  assert.ok(sections.every((section) => section.userData.arcadeV4025NaturalSignature === "basalt-rift-corridor"));
  assert.ok(sections.every((section) => !meshGeometryTypes(section).includes("BoxGeometry")));
  assert.ok(sections.every((section) => meshGeometryTypes(section).includes("DodecahedronGeometry")));
  director.dispose();
});
''', encoding="utf-8")

print("V40.25 signature setpiece naturalization patch applied")
