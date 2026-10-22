/**
 * Re-validate the market entry with a real YAML parser.
 *
 * tools/validate-entry.mjs uses a hand-rolled reader so the repo stays
 * dependency-free. That is fine for a pre-flight, but a hand-rolled reader can
 * agree with a malformed file, so this second opinion uses js-yaml from the DSH
 * profile when it is available.
 *
 * Usage: node tools/validate-entry-yaml.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.env.DSH_PROFILE_DIR ?? "", "noop.js"));

let yaml;
try {
  yaml = require("js-yaml");
} catch {
  console.log("js-yaml not resolvable here; set DSH_PROFILE_DIR to a profile that has it");
  process.exit(0);
}

const text = readFileSync(new URL("../.market/entry.yml", import.meta.url), "utf8");
let doc;
try {
  doc = yaml.load(text);
} catch (error) {
  console.error("YAML parse FAILED:", error.message);
  process.exit(1);
}

console.log(JSON.stringify(doc, null, 2));
const checks = [
  ["url matches repo", doc.url === "https://github.com/zhangaiyu1996/dsh-glm-usage"],
  ["name is owner/repo", doc.name === "zhangaiyu1996/dsh-glm-usage"],
  ["category present", typeof doc.category === "string" && doc.category.length > 0],
  ["en is a string", typeof doc.description?.en === "string"],
  ["en ends with a period", /\.$/u.test(doc.description?.en ?? "")],
  ["zh ends with a period", /。$/u.test(doc.description?.zh ?? "")],
];
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
process.exitCode = checks.every(([, ok]) => ok) ? 0 : 1;
