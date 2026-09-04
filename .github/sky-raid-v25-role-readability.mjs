import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`${path}: patch marker missing`);
  fs.writeFileSync(path, source.replace(before, after));
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, "utf8");
  if (source.includes(marker)) return;
  fs.writeFileSync(path, `${source.trimEnd()}\n\n${content.trim()}\n`);
}

replaceOnce(
  "app/SkyDancerSkyRaidOverlay.tsx",
  `import { skyDancerSkyRaidBossCueActive } from "../src/sky/SkyDancerSkyRaidRules";`,
  `import { skyDancerSkyRaidBossCueActive, skyDancerSkyRaidEnemyDoctrine } from "../src/sky/SkyDancerSkyRaidRules";`,
);

replaceOnce(
  "app/SkyDancerSkyRaidOverlay.tsx",
  `  const bossCueVisible = skyDancerSkyRaidBossCueActive(snapshot.elapsedSeconds, snapshot.bossForced);\n  const accent = hex(snapshot.palette.accent);`,
  `  const bossCueVisible = skyDancerSkyRaidBossCueActive(snapshot.elapsedSeconds, snapshot.bossForced);\n  const enemyDoctrine = skyDancerSkyRaidEnemyDoctrine(snapshot.actId);\n  const accent = hex(snapshot.palette.accent);`,
);

replaceOnce(
  "app/SkyDancerSkyRaidOverlay.tsx",
  `      {snapshot.actElapsedSeconds < 1.6 && !snapshot.clear && (\n        <div className={styles.actBanner}>\n          <small>ACT {snapshot.actIndex + 1} · {snapshot.setpiece}</small>\n          <strong>{snapshot.actLabel}</strong>\n          <span>{snapshot.actSubtitle}</span>\n        </div>\n      )}`,
  `      {snapshot.actElapsedSeconds < 1.9 && !snapshot.clear && (\n        <div className={styles.actBanner}>\n          <small>ACT {snapshot.actIndex + 1} · {snapshot.setpiece}</small>\n          <strong>{snapshot.actLabel}</strong>\n          <div className={styles.packageLine} data-sd-enemy-package-cue="true">\n            ENEMY PACKAGE · {enemyDoctrine.package} · {enemyDoctrine.attackStyle.toUpperCase()}\n          </div>\n          <span>{snapshot.actSubtitle}</span>\n        </div>\n      )}`,
);

replaceOnce(
  "app/SkyDancerSkyRaidOverlay.module.css",
  `.timeline {\n  position: absolute;`,
  `.packageLine {\n  margin-top: 3px;\n  color: rgba(244, 252, 255, .9);\n  font-size: clamp(6px, .72vw, 8px);\n  font-weight: 950;\n  line-height: 1.08;\n  letter-spacing: .105em;\n  white-space: nowrap;\n}\n\n.timeline {\n  position: absolute;`,
);

replaceOnce(
  "app/SkyDancerSkyRaidOverlay.module.css",
  `  .actBanner, .rushBanner, .bossCue { padding-top: 7px; padding-bottom: 8px; }\n}`,
  `  .actBanner, .rushBanner, .bossCue { padding-top: 7px; padding-bottom: 8px; }\n  .packageLine { margin-top: 2px; font-size: 6px; letter-spacing: .08em; }\n}`,
);

const roleKitSource = String.raw`
const SKY_RAID_ROLE_KIT_NAME = "sky-raid-enemy-role-kit";

function skyRaidRoleKitColor(className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>): number {
  switch (className) {
    case "striker": return 0xffa24a;
    case "orbiter": return 0x61e7ff;
    case "drifter": return 0xc59cff;
    case "bomber": return 0xffd15e;
    case "heavy": return 0xff6f75;
    case "standard": return 0x9deaff;
  }
}

function buildSkyRaidEnemyRoleKit(
  className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>,
): THREE.Group {
  const root = new THREE.Group();
  root.name = SKY_RAID_ROLE_KIT_NAME;
  root.userData.skyRaidRoleClass = className;
  const color = skyRaidRoleKitColor(className);
  const armorMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.16,
    roughness: 0.42,
    metalness: 0.22,
    flatShading: true,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    toneMapped: false,
  });
  const addBox = (
    size: [number, number, number],
    position: [number, number, number],
    rotationY = 0,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), armorMaterial.clone());
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    root.add(mesh);
    return mesh;
  };
  const addBeacon = (position: [number, number, number], scale = 0.11): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(scale, 0), glowMaterial.clone());
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  };

  switch (className) {
    case "standard":
      root.userData.skyRaidRoleSignature = "dorsal-spine";
      addBox([0.16, 0.24, 0.88], [0, 0.48, 0.08]);
      break;
    case "striker":
      root.userData.skyRaidRoleSignature = "swept-fangs";
      addBox([0.15, 0.10, 1.02], [-0.82, 0.28, 0.02], 0.52);
      addBox([0.15, 0.10, 1.02], [0.82, 0.28, 0.02], -0.52);
      addBeacon([0, 0.54, 0.72], 0.13);
      break;
    case "orbiter":
      root.userData.skyRaidRoleSignature = "twin-tail";
      addBox([0.11, 0.62, 0.72], [-0.56, 0.52, -0.08], 0.12);
      addBox([0.11, 0.62, 0.72], [0.56, 0.52, -0.08], -0.12);
      addBeacon([-1.05, 0.26, 0.08], 0.10);
      addBeacon([1.05, 0.26, 0.08], 0.10);
      break;
    case "drifter":
      root.userData.skyRaidRoleSignature = "wide-canards";
      addBox([2.34, 0.07, 0.24], [0, 0.18, 0.62]);
      addBox([0.74, 0.08, 0.48], [-0.74, 0.24, -0.46], -0.26);
      addBox([0.74, 0.08, 0.48], [0.74, 0.24, -0.46], 0.26);
      break;
    case "bomber": {
      root.userData.skyRaidRoleSignature = "twin-pods";
      for (const side of [-1, 1] as const) {
        const pod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 1.08, 7),
          armorMaterial.clone(),
        );
        pod.rotation.x = Math.PI / 2;
        pod.position.set(side * 0.74, 0.18, -0.12);
        root.add(pod);
      }
      addBox([1.92, 0.12, 0.34], [0, 0.38, -0.24]);
      addBeacon([0, 0.60, -0.36], 0.12);
      break;
    }
    case "heavy":
      root.userData.skyRaidRoleSignature = "armor-shoulders";
      addBox([0.72, 0.38, 1.48], [0, 0.42, -0.02]);
      addBox([0.82, 0.20, 0.68], [-0.94, 0.28, -0.08], -0.08);
      addBox([0.82, 0.20, 0.68], [0.94, 0.28, -0.08], 0.08);
      addBeacon([0, 0.72, 0.36], 0.14);
      break;
  }
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false;
      object.receiveShadow = false;
      object.renderOrder = 1012;
    }
  });
  return root;
}

function applySkyRaidEnemyRoleReadability(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  for (const enemySnapshot of snapshot.enemies) {
    const group = demo.enemyGroups.get(enemySnapshot.id);
    const enemyState = demo.session.enemies.find((candidate) => candidate.id === enemySnapshot.id);
    if (!group || !enemyState || enemyState.kind === "boss") continue;
    const roleClass = skyDancerSkyRaidEnemyClassFor(enemyState);
    let kit = group.getObjectByName(SKY_RAID_ROLE_KIT_NAME) as THREE.Group | undefined;
    if (!kit || kit.userData.skyRaidRoleClass !== roleClass) {
      if (kit) group.remove(kit);
      kit = buildSkyRaidEnemyRoleKit(roleClass);
      group.add(kit);
    }
    kit.visible = enemySnapshot.alive;
    group.userData.skyRaidRoleClass = roleClass;
    group.userData.skyRaidRoleSignature = kit.userData.skyRaidRoleSignature;
  }

  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetRoleReadability = () => {
      const roles = demo.session.enemies
        .filter((enemy) => enemy.alive && enemy.kind !== "boss")
        .map((enemy) => {
          const group = demo.enemyGroups.get(enemy.id);
          const kit = group?.getObjectByName(SKY_RAID_ROLE_KIT_NAME) as THREE.Group | undefined;
          return {
            id: enemy.id,
            roleClass: skyDancerSkyRaidEnemyClassFor(enemy),
            roleSignature: String(kit?.userData.skyRaidRoleSignature ?? ""),
            kitVisible: kit?.visible === true,
            kitChildren: kit?.children.length ?? 0,
          };
        });
      return {
        activeCount: roles.length,
        roles,
      };
    };
  }
}
`;

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `type SkyRaidFormationBeat = SkyDancerSkyRaidCombatBeat;`,
  `${roleKitSource.trim()}\n\ntype SkyRaidFormationBeat = SkyDancerSkyRaidCombatBeat;`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  applySkyRaidEnemyFlightBand(this);\n  applySkyRaidEnemySilhouetteAssist(this, snapshot);`,
  `  applySkyRaidEnemyFlightBand(this);\n  applySkyRaidEnemyRoleReadability(this, snapshot);\n  applySkyRaidEnemySilhouetteAssist(this, snapshot);`,
);

appendOnce(
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID V25 gives each enemy class a render-only role silhouette and telegraphs the incoming package"`,
  String.raw`
test("SKY RAID V25 gives each enemy class a render-only role silhouette and telegraphs the incoming package", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  const cssSource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.module.css", import.meta.url), "utf8");
  assert.match(raidSource, /SKY_RAID_ROLE_KIT_NAME/);
  assert.match(raidSource, /applySkyRaidEnemyRoleReadability\(this, snapshot\)/);
  assert.match(raidSource, /__skyRaidGetRoleReadability/);
  for (const signature of ["dorsal-spine", "swept-fangs", "twin-tail", "wide-canards", "twin-pods", "armor-shoulders"]) {
    assert.match(raidSource, new RegExp(signature));
  }
  assert.match(overlaySource, /skyDancerSkyRaidEnemyDoctrine\(snapshot\.actId\)/);
  assert.match(overlaySource, /data-sd-enemy-package-cue="true"/);
  assert.match(overlaySource, /ENEMY PACKAGE/);
  assert.match(cssSource, /\.packageLine/);
});
`,
);

console.log("SKY RAID V25 role readability patch applied");
