const ATLAS_URL = new URL("../db/atlas.json", import.meta.url);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function validateAtlas(atlas) {
  assertObject(atlas, "Atlas");

  if (atlas.schema !== "symboldna-atlas") {
    throw new Error("Atlas schema identifier is invalid.");
  }

  if (typeof atlas.version !== "string" || atlas.version.length === 0) {
    throw new Error("Atlas version is missing.");
  }

  if (!Array.isArray(atlas.records)) {
    throw new Error("Atlas records must be an array.");
  }

  if (!Array.isArray(atlas.updateHistory)) {
    throw new Error("Atlas updateHistory must be an array.");
  }

  assertObject(atlas.capabilities, "Atlas capabilities");

  if (atlas.capabilities.appendOnly !== true) {
    throw new Error("Atlas must declare append-only behavior.");
  }

  return atlas;
}

export async function loadAtlas() {
  let response;

  try {
    response = await fetch(ATLAS_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });
  } catch (error) {
    throw new Error(
      "Atlas request failed. Open the project through GitHub Pages or another web server.",
      { cause: error }
    );
  }

  if (!response.ok) {
    throw new Error(
      `Atlas request returned HTTP ${response.status} ${response.statusText}.`
    );
  }

  let atlas;

  try {
    atlas = await response.json();
  } catch (error) {
    throw new Error("Atlas JSON could not be parsed.", { cause: error });
  }

  return validateAtlas(atlas);
}

export function getAtlasSummary(atlas) {
  return {
    name: atlas.name,
    version: atlas.version,
    recordCount: atlas.records.length,
    appendOnly: atlas.capabilities.appendOnly
  };
}
