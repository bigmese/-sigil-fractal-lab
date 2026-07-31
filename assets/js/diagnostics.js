const VALID_STATES = new Set(["pending", "success", "error"]);

export class Diagnostics {
  constructor(documentRef = document) {
    this.document = documentRef;
  }

  set(id, state, detail = "") {
    if (!VALID_STATES.has(state)) {
      throw new Error(`Unknown diagnostic state: ${state}`);
    }

    const row = this.document.getElementById(`diag-${id}`);
    if (!row) {
      throw new Error(`Diagnostic row not found: ${id}`);
    }

    row.dataset.state = state;

    const indicator = row.querySelector(".status");
    if (indicator) {
      indicator.className = `status ${state}`;
    }

    if (detail) {
      row.title = detail;
      row.setAttribute("aria-label", `${id}: ${state}. ${detail}`);
    } else {
      row.removeAttribute("title");
      row.setAttribute("aria-label", `${id}: ${state}`);
    }
  }

  pending(id, detail = "") {
    this.set(id, "pending", detail);
  }

  success(id, detail = "") {
    this.set(id, "success", detail);
  }

  error(id, error) {
    const detail = error instanceof Error ? error.message : String(error);
    this.set(id, "error", detail);
  }

  failRemaining(ids, reason) {
    for (const id of ids) {
      const row = this.document.getElementById(`diag-${id}`);
      if (row?.dataset.state !== "success") {
        this.error(id, reason);
      }
    }
  }
}

export function cssIsReady(documentRef = document) {
  const rootStyle = getComputedStyle(documentRef.documentElement);
  return rootStyle.getPropertyValue("--symboldna-css-ready").trim() === "1";
}
