/**
 * Fetch a file from a GitHub repo through the contents API.
 *
 * raw.githubusercontent.com does not resolve from this network, so this goes
 * through the authenticated API instead (which is also rate-limit-friendly).
 *
 * Usage: node tools/gh-fetch.mjs <owner/repo> <path> <outFile>
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [repo, path, out] = process.argv.slice(2);
if (repo === undefined || path === undefined || out === undefined) {
  console.error("usage: node tools/gh-fetch.mjs <owner/repo> <path> <outFile>");
  process.exit(2);
}

const token = process.env.GHT;
if (token === undefined || token === "") {
  console.error("GHT must hold a GitHub token");
  process.exit(2);
}

const response = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(path)}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    "User-Agent": "dsh-glm-usage-tooling",
    Accept: "application/vnd.github.raw",
  },
});

if (!response.ok) {
  console.error(`HTTP ${response.status} for ${repo}/${path}`);
  const body = await response.text();
  console.error(body.slice(0, 300));
  process.exit(1);
}

const text = await response.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text, "utf8");
console.log(`wrote ${out} (${text.length} bytes)`);
