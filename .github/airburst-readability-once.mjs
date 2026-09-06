import { readFile, writeFile } from "node:fs/promises";

const path = "src/sky/SkyDancerAirCombatFxV2.ts";
let source = await readFile(path, "utf8");

const replacements = [
  [
    "this.spawnAirBurst(this.hitPoint, 0xff6a2d, 1.65, true);",
    "this.spawnAirBurst(this.hitPoint, 0xff6a2d, 1.05, true);",
  ],
  [
    'this.spawnAirBurst(this.burstPoint, enemy.kind === "boss" ? 0xff3e55 : 0xffa13a, enemy.kind === "boss" ? 2.4 : 1.25, false);',
    'this.spawnAirBurst(this.burstPoint, enemy.kind === "boss" ? 0xff3e55 : 0xffa13a, enemy.kind === "boss" ? 1.75 : 0.95, false);',
  ],
  [
    "object.scale.setScalar(0.65 + progress * 2.5);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio;",
    "object.scale.setScalar(0.65 + progress * 1.45);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.82;",
  ],
  [
    "object.scale.setScalar(0.72 + progress * 2.1);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.72;",
    "object.scale.setScalar(0.72 + progress * 1.25);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.60;",
  ],
  [
    "object.scale.setScalar(0.7 + progress * 4.2);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.68;",
    "object.scale.setScalar(0.7 + progress * 2.0);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.38;",
  ],
  [
    "object.scale.setScalar(0.7 + progress * 2.1);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.30;",
    "object.scale.setScalar(0.7 + progress * 1.55);\n          (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.22;",
  ],
];

for (const [before, after] of replacements) {
  const matches = source.split(before).length - 1;
  if (matches !== 1) throw new Error(`expected exactly one match for ${before.slice(0, 80)}, got ${matches}`);
  source = source.replace(before, after);
}

await writeFile(path, source);
console.log("Applied local airburst readability pass: smaller additive cores/rings, preserved streak travel.");
