#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const uleb = (value) => {
  const bytes = [];
  do { let byte = value & 0x7f; value >>>= 7; if (value) byte |= 0x80; bytes.push(byte); } while (value);
  return bytes;
};
const section = (id, payload) => [id, ...uleb(payload.length), ...payload];
const ascii = (value) => [...new TextEncoder().encode(value)];

const type = [1, 0x60, 6, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 1, 0x7f];
const functions = [1, 0];
const name = ascii("classify");
const exports = [1, ...uleb(name.length), ...name, 0, 0];
const expression = [
  0x20, 0x04, 0x20, 0x05, 0x71, 0x04, 0x7f, 0x41, 0x06, 0x05,
  0x20, 0x00, 0x04, 0x7f, 0x41, 0x05, 0x05,
  0x20, 0x01, 0x04, 0x7f, 0x41, 0x03, 0x05,
  0x20, 0x02, 0x04, 0x7f, 0x41, 0x04, 0x05,
  0x20, 0x03, 0x04, 0x7f, 0x41, 0x01, 0x05, 0x41, 0x02,
  0x0b, 0x0b, 0x0b, 0x0b, 0x0b, 0x0b,
];
const body = [0, ...expression];
const code = [1, ...uleb(body.length), ...body];
const binary = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, ...section(1, type), ...section(3, functions), ...section(7, exports), ...section(10, code)]);
const output = resolve(process.argv[2] || resolve(import.meta.dirname, "finality-kernel.wasm"));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, binary);
const wasmInstance = await WebAssembly.instantiate(binary);
if (wasmInstance.instance.exports.classify(0, 0, 0, 0, 0, 0) !== 2) throw new Error("WASM self-test failed: FINAL");
if (wasmInstance.instance.exports.classify(0, 1, 0, 0, 0, 0) !== 3) throw new Error("WASM self-test failed: CONTRADICTED");
if (wasmInstance.instance.exports.classify(0, 0, 0, 0, 1, 1) !== 6) throw new Error("WASM self-test failed: REOPENED");
console.log(output);
