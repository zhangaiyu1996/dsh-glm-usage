/**
 * Scan the repository's text files for UTF-8 replacement characters.
 *
 * A file that carries U+FFFD has been through a lossy transcoding round trip —
 * on Windows that usually means a tool rewrote it as GBK or the console code
 * page got involved. It matters here because the plugin's user-facing strings
 * are Chinese: damage shows up as garbled labels rather than a syntax error.
 *
 * Usage: node tools/scan-encoding.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const targets = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "" && /\.(js|mjs|json|md|yml|yaml|svg)$/u.test(line));

let damaged = 0;
for (const file of targets) {
  const text = readFileSync(file, "utf8");
  const replacements = (text.match(/\uFFFD/gu) ?? []).length;
  const cjk = (text.match(/[\u4e00-\u9fff]/gu) ?? []).length;
  if (replacements > 0) {
    damaged += 1;
    console.log(`DAMAGED  ${file.padEnd(28)} U+FFFD x${replacements}`);
    // Show the offending lines so the fix is obvious.
    text.split("\n").forEach((line, index) => {
      if (line.includes("\uFFFD")) console.log(`         ${String(index + 1).padStart(4)}: ${line.trim().slice(0, 100)}`);
    });
  } else {
    console.log(`ok       ${file.padEnd(28)} cjk=${cjk}`);
  }
}

console.log(damaged === 0 ? "\nall files are clean UTF-8" : `\n${damaged} damaged file(s)`);
process.exitCode = damaged === 0 ? 0 : 1;
