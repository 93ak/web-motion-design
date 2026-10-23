import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// engine/ and state/ must stay free of React, UI code and browser globals.
// If these pass, the evaluator provably cannot depend on any renderer.

const here = path.dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_IMPORT =
  /from\s+["'](react|react-dom)(\/[^"']*)?["']|from\s+["'][^"']*\/(components|hooks)\//;
const FORBIDDEN_GLOBALS = /\b(document|window|localStorage|navigator)\b/;

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function sourceFiles(dir) {
  return fs
    .readdirSync(path.join(here, dir))
    .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"))
    .map((f) => [`${dir}/${f}`, stripComments(fs.readFileSync(path.join(here, dir, f), "utf8"))]);
}

describe("layering rules", () => {
  for (const dir of ["engine", "state"]) {
    for (const [name, source] of sourceFiles(dir)) {
      it(`${name} imports no React or UI code`, () => {
        expect(FORBIDDEN_IMPORT.test(source)).toBe(false);
      });
      it(`${name} touches no browser globals`, () => {
        expect(FORBIDDEN_GLOBALS.test(source)).toBe(false);
      });
    }
  }
});