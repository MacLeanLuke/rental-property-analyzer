/**
 * Refreshes public/vendor/pipe-anatomy.global.js from a local checkout of
 * page-load-anatomy. Vendored rather than installed because the packages are
 * not published yet; this becomes a normal dependency once they are.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source =
  process.env.PIPE_ANATOMY_DIR ??
  resolve(here, "..", "..", "page-load-anatomy");
const bundle = join(source, "packages", "element", "dist", "pipe-anatomy.global.js");

if (!existsSync(bundle)) {
  console.error(`Bundle not found at ${bundle}`);
  console.error("Build it first:");
  console.error("  cd ../page-load-anatomy && npm run build:standalone -w @page-load-anatomy/element");
  console.error("Or point PIPE_ANATOMY_DIR at your checkout.");
  process.exit(1);
}

const target = join(here, "..", "public", "vendor");
mkdirSync(target, { recursive: true });
copyFileSync(bundle, join(target, "pipe-anatomy.global.js"));
console.log("Updated public/vendor/pipe-anatomy.global.js");
