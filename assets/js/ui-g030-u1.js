function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
}

export function setSystemMessage(message, state = "loading") {
  const element = document.getElementById("systemMessage");
  element.textContent = message; element.dataset.state = state;
}

export function populateIntentions(profiles) {
  const select = document.getElementById("intentSelect");
  select.replaceChildren(...profiles.map(profile => {
    const option = document.createElement("option"); option.value = profile.id; option.textContent = profile.label; return option;
  }));
  const defaultProfile = profiles.find(profile => profile.default) || profiles[0];
  if (defaultProfile) select.value = defaultProfile.id;
}

export function updateCanvasMetadata(blueprint) {
  document.getElementById("canvasTitle").textContent = `${blueprint.identity} — ${blueprint.intentLabel}`;
  document.getElementById("grammarBadge").textContent = blueprint.grammar.name;
  document.getElementById("symmetryBadge").textContent = `${blueprint.symmetry}-fold`;
  document.getElementById("symbolCode").textContent = blueprint.code;
  document.getElementById("seedDisplay").textContent = blueprint.seed;
  document.getElementById("topologyReadout").textContent = blueprint.topology;
  document.getElementById("boundaryReadout").textContent = String(blueprint.boundaryCount);
  document.getElementById("centerReadout").textContent = blueprint.centerRole;
  document.getElementById("traversalReadout").textContent = blueprint.traversal.replaceAll("_", " ");
}

export function renderBlueprintInspector(blueprint) {
  const summary = document.getElementById("blueprintSummary");
  const entries = [
    ["Symmetry", `${blueprint.symmetry}-fold`], ["Topology", blueprint.topology], ["Rings", blueprint.ringCount],
    ["Boundaries", blueprint.boundaryCount], ["Curvature", `${Math.round(blueprint.curvature*100)}%`], ["Density", `${Math.round(blueprint.density*100)}%`],
    ["Center", blueprint.centerRole], ["Atlas", blueprint.atlasVersion]
  ];
  summary.classList.remove("empty-state");
  summary.innerHTML = entries.map(([label,value]) => `<div class="blueprint-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  document.getElementById("blueprintRules").innerHTML = blueprint.rules.map(rule => `<article class="rule-card"><strong>${escapeHtml(rule.title)}</strong><p>${escapeHtml(rule.explanation)}</p><div class="rule-source"><span>${escapeHtml(rule.source)}</span><span>${escapeHtml(rule.evidence)}</span></div></article>`).join("");
}

export function renderAtlas(atlas, query = "", kind = "all") {
  const normalized = query.trim().toLowerCase();
  const records = atlas.allRecords.filter(record => (kind === "all" || record.atlasKind === kind) && (!normalized || JSON.stringify(record).toLowerCase().includes(normalized)));
  const list = document.getElementById("atlasRecordList");
  list.innerHTML = records.map(record => {
    const title = record.title || record.name || record.label || record.statement || record.id;
    const description = record.notes || record.description || record.statement || (record.operators ? `Operators: ${record.operators.join(", ")}` : "Atlas record");
    const confidence = typeof record.confidence === "number" ? `<span class="confidence">${Math.round(record.confidence*100)}% confidence</span>` : "";
    return `<article class="atlas-record"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p><div class="record-meta"><span>${escapeHtml(record.atlasKind)}</span><span>${escapeHtml(record.status || "record")}</span>${confidence}<span>${escapeHtml(record.id)}</span></div></article>`;
  }).join("") || `<div class="empty-state">No Atlas records match this filter.</div>`;
}

export function buildAtlasFilters(atlas, onChange) {
  const kinds = ["all", ...Object.keys(atlas.byKind)];
  const bar = document.getElementById("atlasFilterBar");
  let active = "all";
  bar.replaceChildren(...kinds.map(kind => {
    const button = document.createElement("button"); button.type = "button"; button.className = `filter-button${kind === "all" ? " active" : ""}`; button.textContent = kind.replaceAll("_", " ");
    button.addEventListener("click", () => { active = kind; bar.querySelectorAll(".filter-button").forEach(item => item.classList.toggle("active", item === button)); onChange(active); });
    return button;
  }));
  return () => active;
}

export function activateTab(name) {
  document.querySelectorAll(".tab-button").forEach(button => button.classList.toggle("active", button.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === name));
}

export function bindTabs() {
  document.querySelectorAll(".tab-button").forEach(button => button.addEventListener("click", () => activateTab(button.dataset.tab)));
}
