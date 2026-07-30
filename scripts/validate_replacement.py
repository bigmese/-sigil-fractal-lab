from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
required=['index.html','app.js','styles.css','database/manifest.json','database/generator/generator-profile-A0.1.0.json','database/observations/observations-0001.jsonl','database/geometry/geometry-families-0001.jsonl']
missing=[p for p in required if not (root/p).exists()]
if missing: raise SystemExit('Missing: '+', '.join(missing))
manifest=json.loads((root/'database/manifest.json').read_text())
profile=json.loads((root/'database/generator/generator-profile-A0.1.0.json').read_text())
assert manifest['counts']['observations']==72
assert len(profile['intents'])==12
print('Replacement validation passed')
