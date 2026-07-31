const VALID_STATES = new Set(["pending", "success", "error"]);

export class Diagnostics {
  constructor(root = document) {
    this.root = root;
  }

  set(name, state, detail = "") {
    if (!VALID_STATES.has(state)) throw new Error(`Invalid diagnostic state: ${state}`);
    const row = this.root.querySelector(`[data-diagnostic="${name}"]`);
    if (!row) throw new Error(`Diagnostic row not found: ${name}`);
    row.dataset.state = state;
    const message = row.querySelector("small");
    if (message) message.textContent = detail || state;
    row.title = detail || state;
  }

  success(name, detail = "Ready") { this.set(name, "success", detail); }
  pending(name, detail = "Pending") { this.set(name, "pending", detail); }
  error(name, error) { this.set(name, "error", error instanceof Error ? error.message : String(error)); }

  failRemaining(names, error) {
    for (const name of names) {
      const row = this.root.querySelector(`[data-diagnostic="${name}"]`);
      if (row?.dataset.state !== "success") this.error(name, error);
    }
  }
}

export function cssIsReady() {
  return getComputedStyle(document.documentElement).getPropertyValue("--symboldna-css-ready").trim() === "1";
}
