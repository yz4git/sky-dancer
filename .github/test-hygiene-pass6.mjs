import fs from "node:fs/promises";
import ts from "typescript";

const sourcePath = "tests/sky-arcade-reference.test.ts";
const source = await fs.readFile(sourcePath, "utf8");
const ast = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const buckets = {
  flight: new Set([
    "stick maps from its visible center with radial dead zone and bounded diagonals",
    "releasing a downward stick removes drift, including after pause/resume",
    "hero airframe is solid, detailed and batched instead of hundreds of draw calls",
    "actual airframe vertices fit landscape and portrait at all steering limits",
    "flight courses contain visible chicanes, vertical beats and bank reversals before the boss",
    "visual relative pose rotates the complete centreline delta into the current tangent frame",
  ]),
  world: new Set([
    "all eleven environments have bounded geometry and continuous streaming ownership",
    "city renderer contains a river, instanced windows and cloud layers without a decorative horizon carrier",
    "Dawn City uses continuous riverbanks instead of rigid slabs on sharp turns",
    "uses one player-local course frame for horizon, streamed scenery and ribbons",
    "rigid background chunks rotate together instead of swivelling independently",
    "preserves a phone-readable central corridor for visual-only near passes",
    "grounded structural hazards preserve their top while foundations reach the visible floor",
  ]),
  biomes: new Set([
    "ice cavern exposes its vertical canyon without repeated full-screen hoops",
    "floating ruins reads as a broken sky labyrinth instead of a column forest",
    "storm carrier reads as a thunderhead dreadnought instead of floating T-bars",
    "red canyon keeps dramatic walls outside the phone foreground safety lane",
    "desert fortress reads as a sandwall assault instead of a recolored canyon",
    "cloud fleet reads as a sky armada instead of floating T-shaped plates",
    "night metro reads as a neon express pursuit rather than a recolored city river",
    "prism citadel reads as an open final assault rather than a repeated ring tunnel",
    "continuous volcano ribbon and orbital helix expose the real course shape on screen",
  ]),
  presentation: new Set([
    "missile trails and explosions keep a bounded mesh and buffer count under load",
    "detonation hierarchy differentiates small, heavy, boss and missile impacts without unbounded meshes",
    "combat feel keeps tumbling kill debris bounded and fully retires it",
    "Combat 2.0 assigns readable roles, meaningful armor and threat priorities",
    "Boss Battle 2.0 has three HP phases and recurring core-open attack windows",
    "Stage Evolution gives every biome two authored gameplay beats and bounded checkpoints",
    "Cinematic Gameplay boosts camera language for stage, armor, formation and boss beats without gameplay pause",
    "Arcade Meta Layer defaults to migrated v2 career records and milestone slots",
  ]),
};

const imports = [];
const testsByBucket = new Map(Object.keys(buckets).map(key => [key, []]));
const seenTitles = new Set();

function getTestTitle(statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return null;
  const call = statement.expression;
  if (!ts.isIdentifier(call.expression) || call.expression.text !== "test") return null;
  const first = call.arguments[0];
  return first && ts.isStringLiteral(first) ? first.text : null;
}

function collectIdentifiers(node, set) {
  if (ts.isIdentifier(node)) set.add(node.text);
  ts.forEachChild(node, child => collectIdentifiers(child, set));
}

for (const statement of ast.statements) {
  if (ts.isImportDeclaration(statement)) {
    imports.push(statement);
    continue;
  }
  const title = getTestTitle(statement);
  if (!title) {
    const text = source.slice(statement.getFullStart(), statement.getEnd()).trim();
    if (text) throw new Error(`Unexpected top-level statement: ${text.slice(0, 120)}`);
    continue;
  }
  let bucket = null;
  for (const [name, titles] of Object.entries(buckets)) {
    if (titles.has(title)) {
      bucket = name;
      break;
    }
  }
  if (!bucket) throw new Error(`Unclassified Arcade reference test: ${title}`);
  if (seenTitles.has(title)) throw new Error(`Duplicate Arcade reference test title: ${title}`);
  seenTitles.add(title);
  testsByBucket.get(bucket).push(statement);
}

const expectedCount = Object.values(buckets).reduce((sum, titles) => sum + titles.size, 0);
if (seenTitles.size !== expectedCount) {
  const missing = Object.values(buckets).flatMap(titles => [...titles]).filter(title => !seenTitles.has(title));
  throw new Error(`Expected ${expectedCount} tests, found ${seenTitles.size}. Missing: ${missing.join(" | ")}`);
}

function renderImport(decl, used) {
  const clause = decl.importClause;
  if (!clause) return source.slice(decl.getStart(ast), decl.getEnd());
  const moduleName = decl.moduleSpecifier.text;
  const parts = [];
  if (clause.name && used.has(clause.name.text)) parts.push(clause.name.text);
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings) && used.has(bindings.name.text)) {
    parts.push(`* as ${bindings.name.text}`);
  } else if (bindings && ts.isNamedImports(bindings)) {
    const selected = bindings.elements.filter(specifier => used.has(specifier.name.text));
    if (selected.length) {
      const names = selected.map(specifier => {
        const imported = specifier.propertyName?.text;
        return imported ? `${imported} as ${specifier.name.text}` : specifier.name.text;
      });
      parts.push(`{ ${names.join(", ")} }`);
    }
  }
  if (!parts.length) return null;
  return `import ${parts.join(", ")} from ${JSON.stringify(moduleName)};`;
}

const outputs = {
  flight: "tests/sky-arcade-reference-flight.test.ts",
  world: "tests/sky-arcade-reference-world.test.ts",
  biomes: "tests/sky-arcade-reference-biomes.test.ts",
  presentation: "tests/sky-arcade-reference-presentation.test.ts",
};

for (const [bucket, statements] of testsByBucket) {
  const used = new Set();
  for (const statement of statements) collectIdentifiers(statement, used);
  const importLines = imports.map(decl => renderImport(decl, used)).filter(Boolean);
  const body = statements.map(statement => source.slice(statement.getFullStart(), statement.getEnd()).trim()).join("\n\n");
  const output = `${importLines.join("\n")}\n\n${body}\n`;
  await fs.writeFile(outputs[bucket], output);
  console.log(`${bucket}: ${statements.length} tests, ${Buffer.byteLength(output)} bytes`);
}

await fs.unlink(sourcePath);

const readmePath = "tests/README.md";
let readme = await fs.readFile(readmePath, "utf8");
const marker = "Arcade reference suites are split by responsibility";
if (!readme.includes(marker)) {
  readme += `\n${marker}: \`sky-arcade-reference-flight\` covers input/airframe/course behavior, \`sky-arcade-reference-world\` covers shared world geometry/streaming, \`sky-arcade-reference-biomes\` covers stage identity geometry, and \`sky-arcade-reference-presentation\` covers bounded FX/combat/meta presentation behavior. Keep new assertions in the narrowest matching suite instead of rebuilding one monolithic reference file.\n`;
  await fs.writeFile(readmePath, readme);
}

console.log(`Split ${seenTitles.size} Arcade reference tests without changing test bodies.`);
