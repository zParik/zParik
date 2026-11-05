#!/usr/bin/env bash
# Build the subset WOFF2 fonts that render-plates.mjs embeds into SVGs.
# SVGs shown through <img> cannot fetch fonts, so each plate carries its own
# base64 subset (printable ASCII plus a few symbols).
#
# Sources (both SIL OFL 1.1, licences in fonts/):
#   Big Shoulders Display  github.com/google/fonts/tree/main/ofl/bigshouldersdisplay
#   JetBrains Mono         github.com/JetBrains/JetBrainsMono
#
# Usage: put BigShouldersDisplay[wght].ttf as fonts/src/BigShouldersDisplay.ttf
# and JetBrainsMono-Medium.ttf in fonts/src/, then run from repo root.
set -euo pipefail
cd "$(dirname "$0")/.."

UNICODES="U+0020-007E,U+00B7,U+00D7,U+00B0,U+2013,U+2192,U+2191,U+2193,U+2248,U+0394"

fonttools varLib.instancer fonts/src/BigShouldersDisplay.ttf wght=800 \
  -o fonts/src/BigShouldersDisplay-800.ttf -q
fonttools varLib.instancer fonts/src/BigShouldersDisplay.ttf wght=600 \
  -o fonts/src/BigShouldersDisplay-600.ttf -q

for f in BigShouldersDisplay-800 BigShouldersDisplay-600 JetBrainsMono-Medium; do
  pyftsubset "fonts/src/$f.ttf" --unicodes="$UNICODES" --flavor=woff2 \
    --layout-features='kern,liga,tnum' --no-hinting --desubroutinize \
    --output-file="fonts/$f.woff2"
done
ls -l fonts/*.woff2

# Advance widths so the plate generator can fit and place text exactly.
python3 -I - <<'PY'
import json
from fontTools.ttLib import TTFont
out = {}
for name in ["BigShouldersDisplay-800", "BigShouldersDisplay-600", "JetBrainsMono-Medium"]:
    f = TTFont(f"fonts/{name}.woff2")
    cmap, hmtx = f.getBestCmap(), f["hmtx"]
    out[name] = {
        "upm": f["head"].unitsPerEm,
        "adv": {chr(cp): hmtx[g][0] for cp, g in cmap.items()},
    }
json.dump(out, open("fonts/metrics.json", "w"), separators=(",", ":"))
print("wrote fonts/metrics.json")
PY
