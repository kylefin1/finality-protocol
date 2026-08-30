const STATES = ["OPEN", "PENDING", "FINAL", "CONTRADICTED", "CURE_REQUIRED", "FAILED", "REOPENED", "SUPERSEDED"];

/**
 * Loads the memory-safe WASM classification core. Canonical JSON parsing,
 * hashing and signature verification remain host responsibilities and MUST
 * complete before these fail-closed flags are supplied.
 */
export async function loadFinalityWasm(source) {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(await (await fetch(source)).arrayBuffer());
  const { instance } = await WebAssembly.instantiate(bytes);
  const classify = instance.exports.classify;
  if (typeof classify !== "function") throw new Error("FINALITY_WASM_EXPORT_MISSING");
  return {
    classify(input) {
      const code = classify(Number(Boolean(input.stop)), Number(Boolean(input.hardContradiction)), Number(Boolean(input.mandatoryUnsatisfied)), Number(Boolean(input.temporalPending)), Number(Boolean(input.reopenEvent)), Number(input.previousState === "FINAL"));
      return { code, classification: STATES[code] || "FAILED" };
    },
  };
}
