/**
 * Minimal GitHub API helper driven by argv, so shell quoting never matters.
 *
 * Windows PowerShell mangles the quotes in `node -e` one-liners badly enough
 * that a dozen attempts fail for reasons unrelated to the task. Everything that
 * needs the API goes through this file instead.
 *
 * Usage:
 *   node tools/gh.mjs get  <path>                 # GET, prints JSON
 *   node tools/gh.mjs json <method> <path> <file> # method with a JSON body read from a file
 *   GHT must hold a token.
 */
import { readFileSync } from "node:fs";

const [command, ...rest] = process.argv.slice(2);
const token = process.env.GHT;
if (!token) {
  console.error("GHT must hold a GitHub token");
  process.exit(2);
}

const base = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "dsh-glm-usage-tooling",
  Accept: "application/vnd.github+json",
};

/** Perform one request and print the result. */
async function request(method, path, body) {
  const response = await fetch(path.startsWith("http") ? path : `${base}${path}`, {
    method,
    headers: body === undefined ? headers : { ...headers, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

if (command === "get") {
  const { status, payload } = await request("GET", rest[0]);
  console.error(`status ${status}`);
  console.log(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
} else if (command === "json") {
  const [method, path, file] = rest;
  const body = file === undefined ? undefined : JSON.parse(readFileSync(file, "utf8"));
  const { status, payload } = await request(method.toUpperCase(), path, body);
  console.error(`status ${status}`);
  console.log(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
} else {
  console.error("usage: node tools/gh.mjs get <path> | node tools/gh.mjs json <method> <path> <file>");
  process.exit(2);
}
