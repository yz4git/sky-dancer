from pathlib import Path

path = Path('tests/sky-sky-raid.test.ts')
path.write_text(path.read_text().rstrip() + '\n')
print('SKY RAID V34 generated test file normalized')
