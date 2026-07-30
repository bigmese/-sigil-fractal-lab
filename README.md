# SymbolDNA Atlas-Connected Generator

This repository is a complete GitHub Pages replacement build.

## Current release

- Atlas snapshot: **A0.1.0**
- Generator: **G0.2.1**
- Structured recovery cutoff: **SRC-000015**
- Trusted source catalog: **SRC-000001–SRC-000022**
- Color evidence: collected but inactive

## What works

- Loads the Atlas manifest, generator profile, observations, and geometry records from `database/`.
- Uses selected intentions and a private identity fingerprint to derive a deterministic structural profile.
- Preserves radial placement, rings, nodes, center hierarchy, paths, and layers as the visual armature.
- Produces a portable checksummed SymbolDNA v2 code.
- Recreates a symbol from its code under the same Atlas release.
- Creates deterministic related cousins.
- Displays the evidence IDs used in each generated structure.
- Saves the result as PNG.

## GitHub Pages

Place every file and folder in this ZIP at the repository root. `index.html`, `app.js`, `styles.css`, and `database/` must be siblings.

GitHub Pages should publish from the `main` branch root.

## Local test

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
