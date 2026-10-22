/**
 * Verify the remote branch carries the same file contents as the local tree.
 *
 * Git cannot reach github.com:443 from this network, so the last commit was
 * published through the REST API (tools/api-push.mjs). The API builds the
 * commit server-side, which means the resulting SHA differs from the local one
 * even though the trees are identical — this compares blob hashes so that
 * difference is stated rather than assumed.
 *
 * Usage: node tools/verify-remote.mjs <owner/repo> <branch>
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const [repo, branch = "main"] = process.argv.slice(2);
if (repo === undefined) {
  console.error("usage: node tools/verify-remote.mjs <owner/repo> [branch]");
  process.exit(2);
}

const headers = {
  Authorization: `Bearer ${process.env.GHT}`,
  "User-Agent": "dsh-glm-usage-tooling",
  Accept: "application/vnd.github+json",
};

const tree = await (
  await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, { headers })
).json();

if (tree.tree === undefined) {
  console.error("could not read the remote tree:", JSON.stringify(tree).slice(0, 200));
  process.exit(1);
}

const remote = new Map(tree.tree.filter((node) => node.type === "blob").map((node) => [node.path, node.sha]));

// The local side: what git has committed on HEAD.
const tracked = execFileSync("git", ["ls-tree", "-r", "HEAD"], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "")
  .map((line) => {
    const [meta, path] = line.split("\t");
    return { sha: meta.split(/\s+/)[2], path };
  });

let missing = 0;
let differing = 0;
for (const file of tracked) {
  const remoteSha = remote.get(file.path);
  if (remoteSha === undefined) {
    console.log(`MISSING on remote  ${file.path}`);
    missing += 1;
  } else if (remoteSha !== file.sha) {
    // A blob hash is the content hash, so a mismatch is a real content drift.
    console.log(`DIFFERS           ${file.path}  local=${file.sha.slice(0, 7)} remote=${remoteSha.slice(0, 7)}`);
    differing += 1;
  }
}

const remoteOnly = [...remote.keys()].filter((path) => !tracked.some((file) => file.path === path));

console.log(`\ntracked locally : ${tracked.length}`);
console.log(`blobs on remote : ${remote.size}`);
console.log(`missing         : ${missing}`);
console.log(`differing       : ${differing}`);
console.log(`remote-only     : ${remoteOnly.length}${remoteOnly.length ? " (" + remoteOnly.slice(0, 5).join(", ") + ")" : ""}`);

const ok = missing === 0 && differing === 0;
console.log(ok ? "\nPASS  every local file is on the remote with identical content" : "\nFAIL  local and remote disagree");
process.exitCode = ok ? 0 : 1;
