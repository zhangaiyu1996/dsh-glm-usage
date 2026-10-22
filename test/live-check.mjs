#!/usr/bin/env node
/**
 * One-shot quota check, for diagnosing a key or a region without starting DSH.
 *
 * This is the same code path the plugin's host half uses, so a ready answer here
 * means the plugin will read too — and a failure prints the classification the
 * card would show, which is usually the fastest way to tell "wrong region" from
 * "expired key" from "no plan on this account".
 *
 * Usage:
 *   ZAI_API_KEY=... node test/live-check.mjs            # both regions
 *   ZAI_API_KEY=... node test/live-check.mjs cn         # one region
 */

import { fetchQuota, QuotaError } from "../lib/quota.js";

const key = process.env.GLM_TEST_KEY ?? process.env.ZAI_API_KEY;
if (key === undefined || key.trim() === "") {
  console.error("Set ZAI_API_KEY (or GLM_TEST_KEY) to a Coding Plan API key.");
  process.exit(2);
}

const requested = process.argv[2];
const regions = requested === undefined ? ["cn", "global"] : [requested];

/** Print one window as `percent (used/total)` or `n/a`. */
function windowText(w) {
  if (w === undefined) return "n/a";
  const pct = w.percent.toFixed(2) + "%";
  return w.total === undefined ? pct : `${pct} (${w.used ?? 0}/${w.total})`;
}

let failures = 0;
for (const region of regions) {
  try {
    const quota = await fetchQuota({ region, apiKey: key.trim() });
    const tools = quota.mcpTools.map((t) => `${t.id}:${t.used}`).join(", ");
    console.log(`${region.padEnd(7)} OK    plan=${quota.level ?? "?"}  5h=${windowText(quota.session)}  week=${windowText(quota.weekly)}  mcp=${windowText(quota.mcp)}`);
    if (tools !== "") console.log(`${"".padEnd(13)}tools: ${tools}`);
  } catch (error) {
    failures += 1;
    const kind = error instanceof QuotaError ? error.kind : "unexpected";
    console.log(`${region.padEnd(7)} FAIL  [${kind}] ${error instanceof Error ? error.message : String(error)}`);
    if (kind === "auth") console.log(`${"".padEnd(13)}hint: the key is stale, revoked, or belongs to the other region.`);
    if (kind === "no-plan") console.log(`${"".padEnd(13)}hint: this key is a pay-as-you-go key; only Coding Plan keys report quota.`);
  }
}

// Set the code and let the process drain instead of calling process.exit():
// an open fetch keep-alive handle makes an immediate exit trip a libuv
// assertion on Windows, which looks like a crash rather than the answer.
process.exitCode = failures === 0 ? 0 : 1;
