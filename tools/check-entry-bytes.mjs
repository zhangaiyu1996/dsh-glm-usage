/**
 * Verify a market entry file's bytes, not its console rendering.
 *
 * The Windows console shows CJK text in the local code page, which makes a
 * perfectly good UTF-8 file look garbled in terminal output. That is a display
 * artefact, not file damage — this checks the file itself so the difference is
 * settled rather than guessed at.
 *
 * Usage: node tools/check-entry-bytes.mjs <path-to-entry.yml>
 */
import { readFileSync } from "node:fs";

const target = process.argv[2];
if (target === undefined) {
  console.error("usage: node tools/check-entry-bytes.mjs <entry.yml>");
  process.exit(2);
}

const bytes = readFileSync(target);
const text = bytes.toString("utf8");

// A file that is valid UTF-8 round-trips exactly; lossy transcoding does not.
const roundTrip = Buffer.from(text, "utf8").equals(bytes);
const replacements = (text.match(/\uFFFD/gu) ?? []).length;
const cjk = (text.match(/[\u4e00-\u9fff]/gu) ?? []).length;

console.log("file:", target);
console.log("bytes:", bytes.length);
console.log("valid UTF-8 round-trip:", roundTrip);
console.log("U+FFFD replacement chars:", replacements);
console.log("CJK characters:", cjk);

const zhLine = text.split("\n").find((line) => line.trim().startsWith("zh:"));
console.log("zh line present:", zhLine !== undefined);
if (zhLine !== undefined) {
  console.log("zh line has CJK:", /[\u4e00-\u9fff]/u.test(zhLine));
  // Print codepoints rather than the glyphs, so the console cannot lie.
  const sample = [...zhLine.trim()].slice(3, 15).map((ch) => "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"));
  console.log("first codepoints:", sample.join(" "));
}

const ok = roundTrip && replacements === 0 && cjk > 20;
console.log(ok ? "\nPASS  the file is clean UTF-8 with real CJK text" : "\nFAIL  the file is damaged");
process.exitCode = ok ? 0 : 1;
