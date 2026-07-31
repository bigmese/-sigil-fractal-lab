# SymbolDNA G0.3.0

Stage 1 establishes a clean, GitHub Pages-compatible application foundation.

## Included

- Modern responsive interface
- ES module bootstrap
- Permanent startup diagnostics
- Append-only Atlas loader
- Validated JSON Atlas foundation
- SVG construction canvas
- Visible foundation geometry
- No external dependencies

## Deploy on GitHub Pages

1. Upload the **contents inside** the `SymbolDNA-G0.3.0` folder to the root of the repository.
2. In GitHub, open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the repository's main branch and the `/ (root)` folder.
5. Save and wait for GitHub Pages to publish.

Do not open `index.html` directly from the computer. The Atlas uses `fetch()`, so the project must be served through GitHub Pages or another HTTP server.

## Expected diagnostics

After deployment, the page should report:

- HTML — success
- CSS — success
- JavaScript — success
- Atlas — success
- SVG Renderer — success

The canvas should display three construction circles, eight radial guides, anchor points, and a simple visible foundation mark.

## Stage status

This is **Stage 1 only**. Blueprint synthesis and full symbol generation are intentionally not enabled yet.
