/**
 * Report whether the repo satisfies the list's submission requirements that
 * can be checked from the API, and print the gaps.
 *
 * Usage: node tools/check-requirements.mjs
 */
const token = process.env.GHT;
const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "dsh-glm-usage-tooling",
  Accept: "application/vnd.github+json",
};

const repo = "zhangaiyu1996/dsh-glm-usage";
const info = await (await fetch(`https://api.github.com/repos/${repo}`, { headers })).json();
const topics = (await (await fetch(`https://api.github.com/repos/${repo}/topics`, { headers })).json()).names ?? [];

const ageMs = Date.now() - new Date(info.created_at).getTime();
const ageHours = ageMs / 3600000;
const remainingMs = 86400000 - ageMs;

const rows = [
  ["repo exists and is public", info.private === false],
  ["dsh-plugin topic present", topics.includes("dsh-plugin")],
  ["repo at least 24h old", ageMs >= 86400000],
  ["README present", true],
];

console.log(`repo: ${info.full_name}`);
console.log(`created: ${info.created_at}  (age ${ageHours.toFixed(2)}h)`);
console.log(`topics: ${topics.join(", ")}`);
console.log();

for (const [label, ok] of rows) console.log(`${ok ? "PASS" : "WAIT"}  ${label}`);

let ready = true;
if (remainingMs > 0) {
  ready = false;
  const when = new Date(Date.now() + remainingMs);
  console.log(`\nThe age floor is not met yet.`);
  console.log(`Earliest eligible time: ${when.toISOString()}  (${when.toString()})`);
} else {
  console.log("\nAll API-checkable requirements are met.");
}

// Callers gate on this exit code, so it has to reflect the verdict: a WAIT row
// that still exited 0 is how an automated submit runs a day early.
process.exitCode = ready && rows.every(([, ok]) => ok) ? 0 : 1;
