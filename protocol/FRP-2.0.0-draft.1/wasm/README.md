# WASM verifier profile

`finality-kernel.wasm` is an actual WebAssembly module implementing the
fail-closed terminal classification decision over six already-verified flags:
STOP, hard contradiction, mandatory unsatisfied, temporal pending, reopen event,
and previous FINAL. The host remains responsible for schema validation,
canonical JSON, cryptographic hashing, source authority and signature checks.

This split keeps the WASM trusted core tiny and auditable. It is not represented
as a standalone parser or as a replacement for the full offline verifier.
`finality-wasm.mjs` is the browser/edge host adapter.
