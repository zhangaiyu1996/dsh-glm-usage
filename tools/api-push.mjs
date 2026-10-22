/**
 * Push a local commit's tree to GitHub through the REST API.
 *
 * `github.com:443` is unreachable from this network while `api.github.com`
 * works, so `git push` fails at the transport layer even though the token is
 * fine. The contents API is a different host and can carry the same change:
 * create blobs, build a tree on top of the branch head, commit, and move the
 * ref. It is the same objects git would have sent.
 *
 * Usage: node tools/api-push.mjs <owner/repo> <branch> <commitTitleFile> [--dry]
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [repo, branch, messageFile, ...flags] = process.argv.slice(2);
const dry = flags.includes("--dry");

if (repo === undefined || branch === undefined || messageFile === undefined) {
  console.error("usage: node tools/api-push.mjs <owner/repo> <branch> <commitTitleFile> [--dry]");
  process.exit(2);
}

const token = process.env.GHT;
const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "dsh-glm-usage-tooling",
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
};

/** One API call, throwing with the server's message on failure. */
async function api(method, path, body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${payload.message ?? text.slice(0, 200)}`);
  }
  return payload;
}

// Which files changed in the commit we want to publish.
const changed = execFileSync("git", ["diff", "--name-only", "HEAD~1", "HEAD"], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "");
const deleted = execFileSync("git", ["diff", "--name-status", "HEAD~1", "HEAD"], { encoding: "utf8" })
  .split("\n")
  .filter((line) => line.startsWith("D\t"))
  .map((line) => line.split("\t")[1]);

console.log("files to publish:", changed.join(", "));
if (deleted.length) console.log("deleted:", deleted.join(", "));

// Branch head, so the new tree is built on top rather than replacing it.
let headSha;
let baseTree;
try {
  const ref = await api("GET", `/repos/${repo}/git/ref/heads/${branch}`);
  headSha = ref.object.sha;
  baseTree = (await api("GET", `/repos/${repo}/git/commits/${headSha}`)).tree.sha;
  console.log(`branch ${branch} at ${headSha.slice(0, 7)}`);
} catch (error) {
  console.log(`branch ${branch} not found (${error.message.slice(0, 80)}); this would be the first commit`);
}

const treeEntries = [];
for (const file of changed) {
  if (deleted.includes(file)) {
    treeEntries.push({ path: file, mode: "100644", type: "blob", sha: null });
    continue;
  }
  const content = readFileSync(file, "utf8");
  const blob = await api("POST", `/repos/${repo}/git/blobs`, {
    content: Buffer.from(content, "utf8").toString("base64"),
    encoding: "base64",
  });
  treeEntries.push({ path: file, mode: "100644", type: "blob", sha: blob.sha });
  console.log(`  blob ${blob.sha.slice(0, 7)}  ${file}`);
}

if (dry) {
  console.log("\n--dry: stopping before the tree commit");
  process.exit(0);
}

const message = readFileSync(messageFile, "utf8").trim();
const tree = await api("POST", `/repos/${repo}/git/trees`, {
  base_tree: baseTree,
  tree: treeEntries,
});
const commit = await api("POST", `/repos/${repo}/git/commits`, {
  message,
  tree: tree.sha,
  parents: headSha === undefined ? [] : [headSha],
});
console.log("new commit:", commit.sha);

if (headSha === undefined) {
  await api("POST", `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
} else {
  await api("PATCH", `/repos/${repo}/git/refs/heads/${branch}`, { sha: commit.sha, force: false });
}
console.log(`moved ${branch} to ${commit.sha.slice(0, 7)}`);
