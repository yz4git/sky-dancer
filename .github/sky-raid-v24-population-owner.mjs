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
  `  const returnToTitle = () => {\n    // Publish title ownership synchronously as well. More importantly, startRun\n    // already publishes the requested mode before mounting CartRogueGame, and\n    // the mode-sync effect no longer deletes that marker during dependency cleanup.\n    document.documentElement.dataset.skyDancerMode = "title";\n    setActiveRequest(null);\n  };\n\n  return <>`,
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
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
  `test("SKY RAID publishes mode ownership before the first inherited population step", () => {\n  const shellSource = readFileSync(new URL("../app/CartRogueGamePhase13.tsx", import.meta.url), "utf8");\n  const populationSource = readFileSync(new URL("../src/sky/SkyDancerEnemyPopulation.ts", import.meta.url), "utf8");\n  assert.match(shellSource, /const startRun[\\s\\S]*dataset\\.skyDancerMode = request\\.mode[\\s\\S]*setActiveRequest\\(request\\)/);\n  assert.match(shellSource, /useEffect\\(\\(\\) => \\{\\s*document\\.documentElement\\.dataset\\.skyDancerMode = activeRequest\\?\\.mode \\?\\? "title";\\s*\\}, \\[activeRequest\\?\\.mode\\]\\)/);\n  assert.match(shellSource, /useEffect\\(\\(\\) => \\(\\) => \\{\\s*delete document\\.documentElement\\.dataset\\.skyDancerMode;\\s*\\}, \\[\\]\\)/);\n  assert.match(shellSource, /const returnToTitle[\\s\\S]*dataset\\.skyDancerMode = "title"[\\s\\S]*setActiveRequest\\(null\\)/);\n  assert.doesNotMatch(shellSource, /dataset\\.skyDancerMode = activeRequest\\?\\.mode \\?\\? "title";\\s*return \\(\\) =>/);\n  assert.match(populationSource, /const target = isSkyRaidMode\\(\\)\\s*\\? regular\\.length/);\n});\n\ntest("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
);

console.log("SKY RAID V24 pre-frame mode ownership patch applied");
