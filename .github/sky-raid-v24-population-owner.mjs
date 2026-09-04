import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`${path}: patch marker missing`);
  fs.writeFileSync(path, source.replace(before, after));
}

replaceOnce(
  "app/CartRogueGamePhase13.tsx",
  `  useEffect(() => {\n    if (!navigator.webdriver || new URLSearchParams(location.search).has("menu")) return undefined;\n    const timer = window.setTimeout(() => {\n      setCartRunDifficulty("normal");\n      setActiveRequest({ mode: "turbo-hunt", difficulty: "normal" });\n    }, 0);`,
  `  useEffect(() => {\n    if (!navigator.webdriver || new URLSearchParams(location.search).has("menu")) return undefined;\n    const timer = window.setTimeout(() => {\n      document.documentElement.dataset.skyDancerMode = "turbo-hunt";\n      setCartRunDifficulty("normal");\n      setActiveRequest({ mode: "turbo-hunt", difficulty: "normal" });\n    }, 0);`,
);

replaceOnce(
  "app/CartRogueGamePhase13.tsx",
  `  useEffect(() => {\n    document.documentElement.dataset.skyDancerMode = activeRequest?.mode ?? "title";\n    return () => { delete document.documentElement.dataset.skyDancerMode; };\n  }, [activeRequest?.mode]);`,
  `  useEffect(() => {\n    document.documentElement.dataset.skyDancerMode = activeRequest?.mode ?? "title";\n  }, [activeRequest?.mode]);\n\n  useEffect(() => () => {\n    delete document.documentElement.dataset.skyDancerMode;\n  }, []);`,
);

replaceOnce(
  "app/CartRogueGamePhase13.tsx",
  `  return <>`,
  `  const returnToTitle = () => {\n    // Publish title ownership synchronously. startRun already publishes the\n    // requested mode before mounting the renderer, and the keyed mode effect\n    // no longer erases that marker during dependency cleanup.\n    document.documentElement.dataset.skyDancerMode = "title";\n    setActiveRequest(null);\n  };\n\n  return <>`,
);

replaceOnce(
  "app/CartRogueGamePhase13.tsx",
  `      <SkyDancerArcadeMode key={runKey} request={activeRequest} onReturnTitle={() => setActiveRequest(null)} />`,
  `      <SkyDancerArcadeMode key={runKey} request={activeRequest} onReturnTitle={returnToTitle} />`,
);

replaceOnce(
  "app/CartRogueGamePhase13.tsx",
  `      onReturnTitle={() => setActiveRequest(null)}\n`,
  `      onReturnTitle={returnToTitle}\n`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaidRules.ts",
  `  attackStyle: SkyDancerSkyRaidAttackStyle;\n  speedScale: number;`,
  `  attackStyle: SkyDancerSkyRaidAttackStyle;\n  activeTargetCount: number;\n  speedScale: number;`,
);

for (const [packageName, attackStyle, activeTargetCount] of [
  ["CITY INTERCEPTORS", "intercept", 6],
  ["CANYON KNIVES", "knife", 6],
  ["FLEET ESCORT", "escort", 7],
  ["THUNDER HUNTERS", "pincer", 7],
  ["PRISM SIEGE WING", "siege", 7],
]) {
  replaceOnce(
    "src/sky/SkyDancerSkyRaidRules.ts",
    `    package: "${packageName}",\n    roster:`,
    `    package: "${packageName}",\n    roster:`,
  );
  replaceOnce(
    "src/sky/SkyDancerSkyRaidRules.ts",
    `    attackStyle: "${attackStyle}",\n    speedScale:`,
    `    attackStyle: "${attackStyle}",\n    activeTargetCount: ${activeTargetCount},\n    speedScale:`,
  );
}

replaceOnce(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  `let externalSpawnPreference: CartTurboHuntSpawnPreference | null = null;\n\nexport function setCartTurboHuntSpawnPreference(preference: CartTurboHuntSpawnPreference | null): void {\n  externalSpawnPreference = preference;\n}\n`,
  `let externalSpawnPreference: CartTurboHuntSpawnPreference | null = null;\n\nexport function setCartTurboHuntSpawnPreference(preference: CartTurboHuntSpawnPreference | null): void {\n  externalSpawnPreference = preference;\n}\n\nexport interface CartTurboHuntActiveTargetCountContext {\n  elapsedSeconds: number;\n  phase: CartTurboHuntPhase;\n  defaultCount: number;\n}\n\nexport type CartTurboHuntActiveTargetCountResolver = (context: CartTurboHuntActiveTargetCountContext) => number;\nlet externalActiveTargetCountResolver: CartTurboHuntActiveTargetCountResolver | null = null;\n\nexport function setCartTurboHuntActiveTargetCountResolver(resolver: CartTurboHuntActiveTargetCountResolver | null): void {\n  externalActiveTargetCountResolver = resolver;\n}\n`,
);

replaceOnce(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  `function clamp(value: number, min: number, max: number): number {\n  return Math.max(min, Math.min(max, value));\n}\n`,
  `function clamp(value: number, min: number, max: number): number {\n  return Math.max(min, Math.min(max, value));\n}\n\nfunction resolvedActiveTargetCount(state: TurboHuntState): number {\n  const defaultCount = cartTurboHuntActiveTargetCount(state.phase);\n  if (!externalActiveTargetCountResolver) return defaultCount;\n  const resolved = Number(externalActiveTargetCountResolver({\n    elapsedSeconds: state.elapsed,\n    phase: state.phase,\n    defaultCount,\n  }));\n  return Number.isFinite(resolved) ? clamp(Math.floor(resolved), 0, 18) : defaultCount;\n}\n`,
);

replaceOnce(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  `  state.spawnSerial = 0;\n\n  const desired = cartTurboHuntActiveTargetCount(state.phase);`,
  `  state.spawnSerial = 0;\n\n  const desired = resolvedActiveTargetCount(state);`,
);

replaceOnce(
  "src/cart/CartRoguePhase67TurboHunt.ts",
  `function ensureTargetPopulation(session: MutableHuntSession, state: TurboHuntState): void {\n  if (state.phase === "clear") return;\n  const desired = cartTurboHuntActiveTargetCount(state.phase);`,
  `function ensureTargetPopulation(session: MutableHuntSession, state: TurboHuntState): void {\n  if (state.phase === "clear") return;\n  const desired = resolvedActiveTargetCount(state);`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `import {\n  forceCartTurboHuntBoss,\n  getCartTurboHuntSnapshot,`,
  `import {\n  enableCartTurboHunt,\n  forceCartTurboHuntBoss,\n  getCartTurboHuntSnapshot,`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  reseedCartTurboHuntActiveTargets,\n  setCartTurboHuntSpawnPreference,`,
  `  reseedCartTurboHuntActiveTargets,\n  setCartTurboHuntActiveTargetCountResolver,\n  setCartTurboHuntSpawnPreference,`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `export function installSkyDancerSkyRaid(): void {\n  setCartTurboHuntSpawnPreference((enemy, context) => {`,
  `export function installSkyDancerSkyRaid(): void {\n  setCartTurboHuntActiveTargetCountResolver((context) => {\n    if (!isSkyRaidMode()) return context.defaultCount;\n    return skyDancerSkyRaidEnemyDoctrine(skyDancerSkyRaidActFor(context.elapsedSeconds).id).activeTargetCount;\n  });\n  setCartTurboHuntSpawnPreference((enemy, context) => {`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  const previousBuildWorld = webglPrototype.buildWorld;\n  webglPrototype.buildWorld = function skyRaidBuildWorld(this: RaidWebGLDemo): void {\n    if (!isSkyRaidMode()) previousBuildWorld.call(this);\n    buildRaidVisuals(this);\n  };`,
  `  const previousBuildWorld = webglPrototype.buildWorld;\n  webglPrototype.buildWorld = function skyRaidBuildWorld(this: RaidWebGLDemo): void {\n    if (isSkyRaidMode()) {\n      // Turbo Hunt's buildWorld wrapper owns the gameplay bootstrap as well as\n      // its legacy ground visuals. SKY RAID needs the former but intentionally\n      // replaces the latter, so initialize the Hunt session explicitly instead\n      // of depending on a mode-detection race to enter previousBuildWorld().\n      enableCartTurboHunt(this.session);\n    } else {\n      previousBuildWorld.call(this);\n    }\n    buildRaidVisuals(this);\n  };`,
);

replaceOnce(
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
  `test("SKY RAID publishes mode ownership before the first inherited population step", () => {\n  const shellSource = readFileSync(new URL("../app/CartRogueGamePhase13.tsx", import.meta.url), "utf8");\n  const populationSource = readFileSync(new URL("../src/sky/SkyDancerEnemyPopulation.ts", import.meta.url), "utf8");\n  assert.match(shellSource, /const startRun[\\s\\S]*dataset\\.skyDancerMode = request\\.mode[\\s\\S]*setActiveRequest\\(request\\)/);\n  assert.match(shellSource, /useEffect\\(\\(\\) => \\{\\s*document\\.documentElement\\.dataset\\.skyDancerMode = activeRequest\\?\\.mode \\?\\? "title";\\s*\\}, \\[activeRequest\\?\\.mode\\]\\)/);\n  assert.match(shellSource, /useEffect\\(\\(\\) => \\(\\) => \\{\\s*delete document\\.documentElement\\.dataset\\.skyDancerMode;\\s*\\}, \\[\\]\\)/);\n  assert.match(shellSource, /const returnToTitle[\\s\\S]*dataset\\.skyDancerMode = "title"[\\s\\S]*setActiveRequest\\(null\\)/);\n  assert.doesNotMatch(shellSource, /dataset\\.skyDancerMode = activeRequest\\?\\.mode \\?\\? "title";\\s*return \\(\\) =>/);\n  assert.match(populationSource, /const target = isSkyRaidMode\\(\\)\\s*\\? regular\\.length/);\n});\n\ntest("SKY RAID bootstraps Hunt gameplay without rebuilding the legacy Hunt world", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /enableCartTurboHunt,/);\n  assert.match(raidSource, /if \\(isSkyRaidMode\\(\\)\\) \\{[\\s\\S]*enableCartTurboHunt\\(this\\.session\\);[\\s\\S]*\\} else \\{[\\s\\S]*previousBuildWorld\\.call\\(this\\)/);\n  assert.doesNotMatch(raidSource, /if \\(!isSkyRaidMode\\(\\)\\) previousBuildWorld\\.call\\(this\\)/);\n});\n\ntest("SKY RAID keeps the full roster pool while capping live phone density by act", () => {\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidEnemyDoctrine(act.id).activeTargetCount), [6, 6, 7, 7, 7]);\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /setCartTurboHuntActiveTargetCountResolver/);\n  assert.match(raidSource, /activeTargetCount/);\n  assert.match(huntSource, /function resolvedActiveTargetCount\\(state: TurboHuntState\\)/);\n  assert.match(huntSource, /const desired = resolvedActiveTargetCount\\(state\\)/);\n});\n\ntest("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
);

console.log("SKY RAID V24 full-pool bootstrap and live-density patch applied");
