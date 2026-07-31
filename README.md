# SymbolDNA G0.3.0 — Stages 2–6

This cumulative repository replaces the Stage 1 foundation with a usable deterministic SymbolDNA application.

## What works

- Identity + Intent primary inputs
- Deterministic seed and compact Symbol Code
- Atlas-driven Structural Blueprint engine
- Sacred-geometry construction circles, axes, radial divisions, and anchors
- Curves derived from the hidden construction scaffold
- Construction View toggle and staged reveal animation
- Blueprint Inspector with evidence/status explanations
- Append-only Atlas Explorer with search and filters
- SVG, PNG, and Blueprint JSON export
- Permanent startup diagnostics
- Responsive GitHub Pages-compatible interface

## Research boundary

The preserved corpus chunks remain authoritative and append-only. The intention profiles added in `database/generation/intention-profiles-0001.jsonl` are marked `experimental-ui-profile`. They alter structural parameters but are not presented as proven historical meaning correlations.

## Upload to GitHub

1. Extract this ZIP.
2. Open the extracted `SymbolDNA-G0.3.0-All-Stages` folder.
3. Upload **everything inside that folder** to the root of your GitHub repository, replacing files with the same names.
4. In GitHub Pages settings, deploy from the main branch and `/ (root)`.
5. Wait for deployment, then hard-refresh the site.

`.nojekyll` is intentionally not required by this build.

## Validation

For local validation with Node.js:

```bash
npm run validate
```

Do not double-click `index.html` directly. The Atlas uses `fetch()`, so use GitHub Pages or a local HTTP server.
