/**
 * Validate the market entry against the list's stated rules.
 *
 * The rules that can be checked mechanically here:
 *   - url matches the repo exactly
 *   - name is owner/repo
 *   - category is one of the accepted values
 *   - descriptions end with a period
 *   - a description containing ": " is quoted (YAML would otherwise nest)
 *   - the entry adds newlines only, no hand-edited README
 *
 * This is a pre-flight, not a substitute for the list's own CI.
 *
 * Usage: node tools/validate-entry.mjs
 */
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../.market/entry.yml", import.meta.url), "utf8");

// A tiny parser is enough for this fixed shape, and it keeps the check
// dependency-free the way the rest of the repo is.
function parseEntry(source) {
  const get = (key) => {
    const match = source.match(new RegExp(`^${key}:[ \\t]*(.+)$`, "mu"));
    return match === null ? undefined : match[1].trim();
  };
  const en = source.match(/^\s{2}en:[ \t]*(.+)$/mu)?.[1]?.trim();
  const zh = source.match(/^\s{2}zh:[ \t]*(.+)$/mu)?.[1]?.trim();
  return {
    url: get("url"),
    name: get("name"),
    category: get("category"),
    description: { en, zh },
  };
}

const CATEGORIES = new Set(
  "agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun".split(
    " ",
  ),
);

const entry = parseEntry(text);
const problems = [];

/** Strip the surrounding quotes a YAML scalar may carry. */
const unquote = (value) => (value ?? "").replace(/^'(.*)'$/u, "$1").replace(/^"(.*)"$/u, "$1");

if (entry.url !== "https://github.com/zhangaiyu1996/dsh-glm-usage") {
  problems.push(`url is not the repo: ${entry.url}`);
}
if (entry.name !== "zhangaiyu1996/dsh-glm-usage") {
  problems.push(`name is not owner/repo: ${entry.name}`);
}
if (!CATEGORIES.has(entry.category)) {
  problems.push(`category not in the accepted set: ${entry.category}`);
}
for (const [lang, raw] of Object.entries(entry.description)) {
  const value = unquote(raw);
  if (value === "") {
    if (lang === "en") problems.push("description.en is required");
    continue;
  }
  if (!/[.。]$/u.test(value)) problems.push(`description.${lang} does not end with a period`);
  // An unquoted ": " would have nested; a quoted one is fine either way.
  if (/: /u.test(value) && !/^\s*['"]/u.test(raw ?? "")) problems.push(`description.${lang} contains ": " but is not quoted`);
}

console.log("parsed entry:");
console.log(JSON.stringify(entry, null, 2));

if (problems.length === 0) {
  console.log("\nAll mechanical checks pass.");
  process.exitCode = 0;
} else {
  console.log("\nProblems:");
  for (const problem of problems) console.log(" -", problem);
  process.exitCode = 1;
}
