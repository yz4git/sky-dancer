import fs from "node:fs";

const path = "src/sky/SkyDancerSkyRaid.ts";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`V30 contract marker missing: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
`function applySkyRaidEnemyRoleReadability(demo: RaidWebGLDemo): void {
  const attackTelegraphs = new Map(`,
`function applySkyRaidEnemyRoleReadability(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  // Preserve the V25 presentation contract while the production hot path reads
  // authoritative enemy objects directly. Snapshot is retained for webdriver
  // diagnostics/source compatibility and carries no extra lookup work here.
  void snapshot;
  const attackTelegraphs = new Map(`,
"role readability signature",
);

replaceOnce(
`  applySkyRaidEnemyRoleReadability(this);`,
`  applySkyRaidEnemyRoleReadability(this, snapshot);`,
"role readability call",
);

replaceOnce(
`    group.updateWorldMatrix(true, false);
    const world = new THREE.Vector3();
    group.getWorldPosition(world);`,
`    const world = new THREE.Vector3();
    // getWorldPosition updates only this object's ancestor chain. Avoid the
    // redundant explicit updateWorldMatrix call after removing the scene-wide walk.
    group.getWorldPosition(world);`,
"redundant enemy matrix update",
);

fs.writeFileSync(path, source);
console.log("SKY RAID V30 source contract fix applied");
