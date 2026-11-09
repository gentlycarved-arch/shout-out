#!/usr/bin/env python3
"""Make a catalogue of every font you have, for the font tool (docs/font-tool.js).

    python3 tools/font-catalogue.py [extra font folders …]

Reads ~/Library/Fonts and /Library/Fonts, plus any folders you name, and copies the fonts into docs/.fonts/
with a list, docs/.fonts/fonts.json. Both stay on your computer: docs/.fonts is in .gitignore, because many
fonts (trials especially) can't be published. Open any page of the site with ?fonts to use them.
"""
import hashlib, json, os, shutil, sys
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', '.fonts')
EXT = ('.ttf', '.otf', '.woff', '.woff2')

folders = [os.path.expanduser('~/Library/Fonts'), '/Library/Fonts'] + [os.path.expanduser(a) for a in sys.argv[1:]]


def name(font, *ids):
    table = font['name']
    for i in ids:
        for rec in table.names:
            if rec.nameID == i and rec.platformID in (3, 0):
                try:
                    return rec.toUnicode().strip()
                except Exception:
                    pass
        rec = table.getName(i, 1, 0, 0)
        if rec:
            return rec.toUnicode().strip()
    return ''


families = {}
seen = set()
for folder in folders:
    if not os.path.isdir(folder):
        continue
    for dirpath, _, files in os.walk(folder):
        for f in sorted(files):
            if not f.lower().endswith(EXT):
                continue
            path = os.path.join(dirpath, f)
            try:
                font = TTFont(path, lazy=True, fontNumber=0)
                family = name(font, 16, 1)
                style = name(font, 17, 2) or 'Regular'
                if not family:
                    continue
                os2 = font['OS/2'] if 'OS/2' in font else None
                weight = int(os2.usWeightClass) if os2 else 400
                italic = bool(os2 and (os2.fsSelection & 1)) or 'italic' in style.lower() or 'oblique' in style.lower()
                axes = {a.axisTag: [a.minValue, a.maxValue] for a in font['fvar'].axes} if 'fvar' in font else {}
                mono = bool(font['post'].isFixedPitch) if 'post' in font else False
                font.close()
            except Exception as e:
                print('skipped', path, '-', e)
                continue
            key = (family.lower(), style.lower(), bool(axes))
            if key in seen:
                continue
            seen.add(key)
            digest = hashlib.sha1(path.encode()).hexdigest()[:10]
            target = digest + os.path.splitext(f)[1].lower()
            os.makedirs(OUT, exist_ok=True)
            if not os.path.exists(os.path.join(OUT, target)):
                shutil.copyfile(path, os.path.join(OUT, target))
            entry = families.setdefault(family, {'family': family, 'mono': False, 'styles': [], 'from': set()})
            entry['mono'] = entry['mono'] or mono or 'mono' in family.lower()
            entry['from'].add(folder)
            s = {'style': style, 'weight': weight, 'italic': italic, 'file': target}
            if 'wght' in axes:
                s['weights'] = [int(axes['wght'][0]), int(axes['wght'][1])]
            entry['styles'].append(s)

out = []
for fam in sorted(families.values(), key=lambda x: x['family'].lower()):
    fam['styles'].sort(key=lambda s: (s['italic'], s.get('weights', [s['weight']])[0], s['style']))
    fam['from'] = sorted(fam['from'])
    out.append(fam)
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'fonts.json'), 'w') as fh:
    json.dump({'families': out}, fh, indent=1)
print(f"{len(out)} families, {sum(len(f['styles']) for f in out)} styles -> docs/.fonts/fonts.json")
