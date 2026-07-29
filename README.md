# SymbolDNA Atlas-Connected Generator

**Atlas A0.1.0 · Generator G0.2.0 · experimental connected release**

SymbolDNA is a deterministic symbolic-construction system. The current generator supplies the placement armature—center, boundaries, radial positions, layers, and paths—while the released Symbol Atlas selects and weights source-scoped construction evidence.

This release is the first version in which the website actually loads the Atlas database. It does not copy historical figures, and it does not claim that a generated symbol has universal spiritual meaning.

## What changed in G0.2.0

- The website loads and SHA-256 checks the released Atlas manifest and data chunks.
- Hard-coded intention profiles were removed from `index.html`.
- Intentions now retrieve ranked observations, meanings, and geometry families from the reviewed experimental generator profile.
- Atlas evidence is converted into eight structural dimensions: Boundary, Centrality, Radiality, Connectivity, Nesting, Angularity, Flow, and Repetition.
- The existing center/ring/path generator remains the underlying placement architecture.
- The visible random seed was replaced with a portable, checksummed Symbol Code.
- **Create related cousin** changes the deterministic evidence selection without changing the identity or intentions.
- **Recreate from code** reproduces the same output when the pinned Atlas and generator versions are available.
- Atlas and generator versions are recorded separately so changes can be audited.
- The output lists the exact observation and geometry IDs that influenced the composition.
- Twelve benchmark Symbol Codes and machine-verified baseline image hashes are included.
- Eight color-evidence records were backfilled, but color generation remains inactive.

## Run the website

The database is loaded with `fetch()`, so opening `index.html` directly as a `file://` page will not work.

### GitHub Pages

1. Upload this repository to GitHub.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the main branch and `/ (root)`.
5. Open the published Pages address after deployment finishes.

### Local development

From the repository root:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Validate the release

```bash
python scripts/validate_dataset.py
python scripts/validate_generator.py
node scripts/test_symbol_code.mjs
```

The browser baseline included with this package passed:

- Atlas connection and file-integrity loading
- 8 Structural DNA outputs
- traceable evidence cards
- cousin output changes
- exact same-version Symbol Code restoration
- 12 unique benchmark image hashes
- zero browser console errors in the test run

## Data and release model

The evidence ledger is append-only. New JSONL chunks are added rather than replacing old chunks. The release builder loads all chunks of each evidence type, resolves superseding records into an active view, and recomputes the living synthesis across the full active corpus.

```text
Append-only evidence chunks
          ↓
Active view with supersession
          ↓
Living synthesis across old + new evidence
          ↓
Reviewed experimental generator profile
          ↓
Versioned benchmark and impact report
          ↓
Released Atlas snapshot used by the website
```

Run `scripts/build_atlas_release.py` after verified evidence chunks have been added. Earlier synthesis, profiles, benchmarks, and impact reports are retained in `database/release_history` through the manifest.

## Important limits

- Structured observation recovery currently ends at `SRC-000015`.
- The source catalog extends through `SRC-000022`, but `SRC-000016` onward is not yet fully structured in this snapshot.
- No canonical DNA candidate has been promoted by the research corpus.
- The generator profile is explicitly experimental.
- Sparse intention categories may use clearly labeled fallback geometry families.
- Free-text intention recognition is not included.
- Atlas-derived color generation is not included.
- Source PDFs and copyrighted page images are not included.
