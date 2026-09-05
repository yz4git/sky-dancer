import fs from "node:fs";

function replaceOnce(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`V29 visibility marker missing: ${label}`);
  return source.replace(marker, replacement);
}

{
  const path = "src/sky/SkyDancerSkyRaid.ts";
  let source = fs.readFileSync(path, "utf8");
  source = replaceOnce(
    source,
    "  if (visible.length >= 2) {\n    state.nextAllowedAt = 0;\n    return;\n  }",
    "  // Long-form 90 s Acts need a stable minimum dogfight presence on phones.\n  // Keep three aircraft projected in-frame without increasing the live enemy cap.\n  if (visible.length >= 3) {\n    state.nextAllowedAt = 0;\n    return;\n  }",
    "minimum visible aircraft",
  );
  source = replaceOnce(
    source,
    "  const needed = Math.min(2 - visible.length, candidates.length);",
    "  const needed = Math.min(3 - visible.length, candidates.length);",
    "visibility recycle count",
  );
  fs.writeFileSync(path, source);
}

{
  const path = "tests/sky-sky-raid.test.ts";
  let source = fs.readFileSync(path, "utf8");
  const marker = "  assert.match(overlaySource, /FREE HUNT/);\n});";
  const replacement = "  assert.match(overlaySource, /FREE HUNT/);\n  assert.match(raidSource, /if \\(visible\\.length >= 3\\)/);\n  assert.match(raidSource, /Math\\.min\\(3 - visible\\.length, candidates\\.length\\)/);\n});";
  source = replaceOnce(source, marker, replacement, "visibility regression contract");
  fs.writeFileSync(path, source);
}

console.log("SKY RAID V29 phone visibility fixed");
