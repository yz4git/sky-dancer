from pathlib import Path

root = Path(__file__).resolve().parents[1]
presentation_path = root / "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"
webgl_path = root / "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
test_path = root / "tests/sky-arcade-run.test.ts"

presentation = presentation_path.read_text()
webgl = webgl_path.read_text()
tests = test_path.read_text()

replacements = [
    (
        'float cloud=pow(max(0.0,core),1.35);vec3 whiteSmoke=mix(vec3(.68,.73,.79),vec3(1.18,1.2,1.22),cloud);\n          gl_FragColor=vec4(whiteSmoke,cloud*vAlpha*.82);',
        'float cloud=pow(max(0.0,core),1.12);vec3 whiteSmoke=mix(vec3(.82,.86,.91),vec3(1.48,1.5,1.52),cloud);\n          gl_FragColor=vec4(whiteSmoke,cloud*vAlpha*.96);'
    ),
    (
        '  emit(position: THREE.Vector3, scale = 1): void {\n    const index = this.cursor++ % this.particles.length;\n    const particle = this.particles[index];\n    const seed = ++this.serial * 9.37;\n    particle.position.copy(position);\n    particle.velocity.set((noise(seed) - .5) * .58, .28 + noise(seed + 1) * .58, (noise(seed + 2) - .5) * .34);\n    particle.age = 0;\n    particle.duration = .5 + noise(seed + 3) * .34;\n    particle.size = (.58 + noise(seed + 4) * .44) * scale;\n    particle.rotation = noise(seed + 5) * Math.PI * 2;\n  }',
        '  emit(position: THREE.Vector3, scale = 1): void {\n    // Two overlapping puffs make the exhaust read as dense white missile smoke even on a phone-sized viewport.\n    for (let plume = 0; plume < 2; plume++) {\n      const index = this.cursor++ % this.particles.length;\n      const particle = this.particles[index];\n      const seed = ++this.serial * 9.37;\n      particle.position.copy(position);\n      particle.position.x += (noise(seed + 6) - .5) * .3 * scale;\n      particle.position.y += (noise(seed + 7) - .5) * .22 * scale;\n      particle.velocity.set((noise(seed) - .5) * .82, .34 + noise(seed + 1) * .76, (noise(seed + 2) - .5) * .5);\n      particle.age = 0;\n      particle.duration = .86 + noise(seed + 3) * .52;\n      particle.size = (1.12 + noise(seed + 4) * .82) * scale;\n      particle.rotation = noise(seed + 5) * Math.PI * 2;\n    }\n  }'
    ),
    (
        '        const size = p.size * (.78 + t * 1.72);\n        this.dummy.scale.set(size * (1.08 + t * .22), size, 1);\n        this.alpha.setX(i, Math.pow(1 - t, 1.18));',
        '        const size = p.size * (.92 + t * 2.2);\n        this.dummy.scale.set(size * (1.12 + t * .32), size, 1);\n        this.alpha.setX(i, Math.pow(1 - t, .82));'
    ),
    (
        '      opacity: { value: enemy ? .62 : playerMissile ? .96 : .76 },',
        '      opacity: { value: enemy ? .62 : playerMissile ? 1 : .76 },'
    ),
    (
        '      float tail=pow(clamp(vUv.y,0.0,1.0),smokeBody>.5?1.3:2.25);',
        '      float tail=pow(clamp(vUv.y,0.0,1.0),smokeBody>.5?.82:2.25);'
    ),
    (
        '    width: enemy ? .19 : playerMissile ? .42 : .22, playerMissile,\n    retireSeconds: playerMissile ? .5 : RETIRE_SECONDS, retiredAge: null,',
        '    width: enemy ? .19 : playerMissile ? .72 : .22, playerMissile,\n    retireSeconds: playerMissile ? .76 : RETIRE_SECONDS, retiredAge: null,'
    ),
    (
        '          this.missileSmoke.emit(this.missilePoint, 1.12);',
        '          this.missileSmoke.emit(this.missilePoint, 1.52);'
    ),
    (
        '          if (movedSq > .18) {\n            if (movedSq > 1.35) {',
        '          if (movedSq > .1) {\n            if (movedSq > .64) {'
    ),
    (
        '              this.missileSmoke.emit(this.missileMidpoint, .92);',
        '              this.missileSmoke.emit(this.missileMidpoint, 1.15);'
    ),
    (
        '            this.missileSmoke.emit(this.missilePoint, 1.02);',
        '            this.missileSmoke.emit(this.missilePoint, 1.24);'
    ),
]

for old, new in replacements:
    assert old in presentation, old
    presentation = presentation.replace(old, new, 1)

old = '          ? new THREE.ConeGeometry(0.2, 1.26, 8)'
new = '          ? new THREE.ConeGeometry(0.28, 1.58, 8)'
assert old in webgl
webgl = webgl.replace(old, new, 1)

old = '  assert.match(presentationSource, /width: enemy \\? \\.19 : playerMissile \\? \\.42 : \\.22/);'
new = '  assert.match(presentationSource, /width: enemy \\? \\.19 : playerMissile \\? \\.72 : \\.22/);'
assert old in tests
tests = tests.replace(old, new, 1)

presentation_path.write_text(presentation)
webgl_path.write_text(webgl)
test_path.write_text(tests)
print("Applied V9.6.1 high-visibility missile plume pass")
