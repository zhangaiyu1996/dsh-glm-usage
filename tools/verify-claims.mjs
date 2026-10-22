/**
 * Check every claim in the market description against the code.
 *
 * The list's review reads the description as a claim about the plugin and
 * checks it against the source; overstating is the one thing that sends an
 * otherwise-good entry back. Each assertion below names the phrase in the entry
 * and the code that has to back it.
 *
 * Usage: node tools/verify-claims.mjs
 */
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const host = readFileSync(new URL("../lib/index.js", import.meta.url), "utf8");
const quota = readFileSync(new URL("../lib/quota.js", import.meta.url), "utf8");

const checks = [
  // "a footer card"
  ["footer card registered in sidebar", /name:\s*"sidebar\.footer\.action"/u.test(client)],
  // "with the 5-hour, weekly and MCP windows"
  ["labels a 5-hour window", /session:/u.test(client) && /\\u5c0f\\u65f6/u.test(client)],
  ["labels a weekly window", /weekly:/u.test(client)],
  ["reads the MCP window", /quota\.mcp/u.test(client)],
  ["maps unit 3 to the session window", /UNIT_SESSION\s*=\s*3/u.test(quota)],
  ["maps unit 6 to the weekly window", /UNIT_WEEKLY\s*=\s*6/u.test(quota)],
  ["maps unit 5 to the MCP ceiling", /UNIT_MONTHLY\s*=\s*5/u.test(quota)],
  // "a detail panel that adds reset times"
  ["has a detail panel in main", /name:\s*"main"/u.test(client)],
  ["panel shows reset times", /resetAt|noReset/u.test(client)],
  // "and per-tool MCP counts"
  ["collects per-tool MCP counts", /mcpTools/u.test(quota)],
  ["panel renders the tool table", /gu-table/u.test(client) && /mcpTools/u.test(client)],
  // "read from open.bigmodel.cn or api.z.ai"
  ["supports the China host", /open\.bigmodel\.cn/u.test(quota)],
  ["supports the international host", /api\.z\.ai/u.test(quota)],
  ["both hosts are selectable", /global/u.test(host) && /"cn"/u.test(host)],
  // "with the key kept host-side"
  ["the browser never receives the key", !/apiKey\s*:\s*(key|secret)/u.test(client)],
  ["settings expose only hasSavedKey", /hasSavedKey/u.test(host)],
  ["upstream fetch happens in the host half", /fetchQuota/u.test(host)],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}
console.log(failed === 0 ? `\nall ${checks.length} claims are backed by the code` : `\n${failed} claim(s) unbacked`);
process.exitCode = failed === 0 ? 0 : 1;
