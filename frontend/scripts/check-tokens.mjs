// Fails when the extension's copy of the design tokens drifts from the website's source of truth.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = resolve(root, "frontend/src/styles/tokens.css");
const copy = resolve(root, "extension/tokens.css");
const norm = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

if (norm(source) !== norm(copy)) {
  console.error(`Design tokens out of sync: copy ${source} to ${copy}.`);
  process.exit(1);
}
console.log("Design tokens in sync.");
