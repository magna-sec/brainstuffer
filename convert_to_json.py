#!/usr/bin/env python3
"""Convert YAML quiz files to JSON for the static GitHub Pages build."""

import json
import os
from yaml import safe_load

YAML_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(YAML_DIR, 'docs', 'data')

os.makedirs(OUT_DIR, exist_ok=True)

manifest = []

for f in sorted(os.listdir(YAML_DIR)):
    if f.endswith(('.yml', '.yaml')) and not f.startswith(('incorrect_', 'template')):
        filepath = os.path.join(YAML_DIR, f)
        with open(filepath, encoding='utf-8') as fh:
            data = safe_load(fh)
        if not data:
            continue
        json_name = os.path.splitext(f)[0] + '.json'
        out_path = os.path.join(OUT_DIR, json_name)
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False)
        manifest.append({'file': json_name, 'label': os.path.splitext(f)[0].replace('_', ' ').title(), 'count': len(data)})
        print(f'  {f} -> {json_name} ({len(data)} questions)')

# Write manifest so the static site knows which quiz files exist
with open(os.path.join(OUT_DIR, 'manifest.json'), 'w', encoding='utf-8') as fh:
    json.dump(manifest, fh, ensure_ascii=False, indent=2)

print(f'\nDone. {len(manifest)} quiz files converted. Manifest written.')
