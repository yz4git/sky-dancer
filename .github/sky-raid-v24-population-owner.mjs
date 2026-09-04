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
  "src/sky/SkyDancerSkyRaid.ts",
  `import {\n  forceCartTurboHuntBoss,\n  getCartTurboHuntSnapshot,`,
  `import {\n  enableCartTurboHunt,\n  forceCartTurboHuntBoss,\n  getCartTurboHuntSnapshot,`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `  const previousBuildWorld = webglPrototype.buildWorld;\n  webglPrototype.buildWorld = function skyRaidBuildWorld(this: RaidWebGLDemo): void {\n    if (!isSkyRaidMode()) previousBuildWorld.call(this);\n    buildRaidVisuals(this);\n  };`,
  `  const previousBuildWorld = webglPrototype.buildWorld;\n  webglPrototype.buildWorld = function skyRaidBuildWorld(this: RaidWebGLDemo): void {\n    if (isSkyRaidMode()) {\n      // Turbo Hunt's buildWorld wrapper owns the gameplay bootstrap as well as\n      // its legacy ground visuals. SKY RAID needs the former but intentionally\n      // replaces the latter, so initialize the Hunt session explicitly instead\n      // of depending on a mode-detection race to enter previousBuildWorld().\n      enableCartTurboHunt(this.session);\n    } else {\n      previousBuildWorld.call(this);\n    }\n    buildRaidVisuals(this);\n  };`,
);

replaceOnce(
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
  `test("SKY RAID publishes mode ownership before the first inherited population step", () => {\n  const shellSource = readFileSync(new URL("../app/CartRogueGamePhase13.tsx", import.meta.url), "utf8");\n  const populationSource = readFileSync(new URL("../src/sky/SkyDancerEnemyPopulation.ts", import.meta.url), "utf8");\n  assert.match(shellSource, /const startRun[\\s\\S]*dataset\\.skyDancerMode = request\\.mode[\\s\\S]*setActiveRequest\\(request\\)/);\n  assert.match(shellSource, /useEffect\\(\\(\\) => \\{\\s*document\\.documentElement\\.dataset\\.skyDancerMode = activeRequest\\?\\.mode \\?\\? "title";\\s*\\}, \\[activeRequest\\?\\.mode\\]\\)/);\n  assert.match(shellSource, /useEffect\\(\\(\\) => \\(\\) => \\{\\s*delete document\\.documentElement\\.dataset\\.skyDancerMode;\\s*\\}, \\[\\]\\)/);\n  assert.match(shellSource, /const returnToTitle[\\s\\S]*dataset\\.skyDancerMode = "title"[\\s\\S]*setActiveRequest\\(null\\)/);\n  assert.doesNotMatch(shellSource, /dataset\\.skyDancerMode = activeRequest\\?\\.mode \\?\\? "title";\\s*return \\(\\) =>/);\n  assert.match(populationSource, /const target = isSkyRaidMode\\(\\)\\s*\\? regular\\.length/);\n});\n\ntest("SKY RAID bootstraps Hunt gameplay without rebuilding the legacy Hunt world", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /enableCartTurboHunt,/);\n  assert.match(raidSource, /if \\(isSkyRaidMode\\(\\)\\) \\{[\\s\\S]*enableCartTurboHunt\\(this\\.session\\);[\\s\\S]*\\} else \\{[\\s\\S]*previousBuildWorld\\.call\\(this\\)/);\n  assert.doesNotMatch(raidSource, /if \\(!isSkyRaidMode\\(\\)\\) previousBuildWorld\\.call\\(this\\)/);\n});\n\ntest("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
);

console.log("SKY RAID V24 gameplay bootstrap and pre-frame ownership patch applied");
