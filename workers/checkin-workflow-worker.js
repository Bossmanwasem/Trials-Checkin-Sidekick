function normalizeFileName(name) {
  return typeof name === "string" ? name.toLowerCase() : "";
}

function getVocabTypesFromFileNames(fileNames) {
  const hasGrid = fileNames.some(name => normalizeFileName(name).endsWith(".grid3user"));
  const hasP2G = fileNames.some(name => normalizeFileName(name).endsWith(".p2gbk"));
  const hasSaltillo = fileNames.some(name => {
    const normalized = normalizeFileName(name);
    return normalized.endsWith(".ce") || normalized.endsWith(".wf");
  });

  const ordered = [];
  if (hasGrid) ordered.push("Grid");
  if (hasP2G) ordered.push("P2G");
  if (hasSaltillo) ordered.push("Saltillo");
  return ordered;
}

function buildZipFilename(payload) {
  const firstName = typeof payload?.firstName === "string" ? payload.firstName : "";
  const lastName = typeof payload?.lastName === "string" ? payload.lastName : "";
  const dateStr = typeof payload?.dateStr === "string" && payload.dateStr ? payload.dateStr : "Unknown Date";
  const fileNames = Array.isArray(payload?.fileNames) ? payload.fileNames : [];

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Client";
  const vocabTypes = getVocabTypesFromFileNames(fileNames);
  const typeLabel = vocabTypes.length ? vocabTypes.join(", ") : "Vocab";

  return `${fullName} ${typeLabel} Vocab from Trial ${dateStr}.zip`;
}

self.onmessage = event => {
  const { type, payload = {}, requestId } = event?.data || {};

  try {
    if (type === "BUILD_ZIP_FILENAME") {
      const zipName = buildZipFilename(payload);
      self.postMessage({ type: "WORKFLOW_DONE", requestId, payload: { zipName } });
      return;
    }

    throw new Error(`Unsupported workflow task: ${type || "(empty)"}`);
  } catch (error) {
    self.postMessage({
      type: "WORKFLOW_ERROR",
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
