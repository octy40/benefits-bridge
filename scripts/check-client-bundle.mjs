/**
 * Confirms the API key is absent from everything the browser is served.
 *
 * The key is a paid credential on a route with no authentication in front of it,
 * so "we never prefixed it with NEXT_PUBLIC_" is a claim worth being able to
 * re-check rather than a thing to remember. Run it against a real build, before
 * every deploy:
 *
 *   npm run build && npm run check:client-bundle
 *
 * Exits non-zero on a hit, so it can gate a deploy.
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// .next/static is the client bundle; the prerendered HTML under .next/server/app
// is served to the browser too, and would carry anything inlined into an RSC payload.
const SERVED_TO_THE_BROWSER = [".next/static", ".next/server/app"];

const key = process.env.ANTHROPIC_API_KEY;

const needles = [
  { pattern: "ANTHROPIC_API_KEY", why: "the variable name" },
  { pattern: "sk-ant-", why: "an Anthropic key prefix" },
  ...(key ? [{ pattern: key, why: "the key currently in the environment" }] : []),
];

const hits = [];

for (const root of SERVED_TO_THE_BROWSER) {
  for await (const file of walk(root)) {
    const contents = readFileSync(file, "utf8");
    for (const { pattern, why } of needles) {
      if (contents.includes(pattern)) hits.push({ file, why });
    }
  }
}

if (hits.length > 0) {
  console.error("The API key, or a trace of it, reached the browser:\n");
  for (const { file, why } of hits) console.error(`  ${file} — ${why}`);
  console.error("\nDo not deploy. Find the client component or inlined value that pulled it in.");
  process.exit(1);
}

if (!key) {
  console.warn("ANTHROPIC_API_KEY is not set locally, so the key's own value was not searched for.");
}

console.log("Clean: no key, key prefix, or variable name in anything served to the browser.");

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    throw new Error(`${dir} is missing. Run \`npm run build\` first.`);
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(js|mjs|cjs|html|json|txt|map|rsc)$/.test(entry.name)) yield path;
  }
}
