from pathlib import Path

p=Path(__file__).resolve().parents[1]/"src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
text=p.read_text()

def patch_method(source: str, marker: str) -> str:
    start=source.index(marker)
    next_method=source.find("\n  private ", start+len(marker))
    if next_method < 0:
        next_method=len(source)
    section=source[start:next_method]
    guard="if(!this.stage || !this."
    if "const stage=this.stage;" not in section:
        line_end=section.index("\n", section.index(guard))
        section=section[:line_end+1]+"    const stage=this.stage;\n"+section[line_end+1:]
    old="arcadeCourseRelativePose(this.stage,distance,depth)"
    if old not in section:
        raise SystemExit(f"course anchor missing in {marker}")
    section=section.replace(old,"arcadeCourseRelativePose(stage,distance,depth)",1)
    return source[:start]+section+source[next_method:]

text=patch_method(text,"  private updateIceRibbon(")
text=patch_method(text,"  private updateVolcanoRibbon(")
p.write_text(text)
print("Fixed existing Arcade world nullable stage narrowing in ribbon methods only")
