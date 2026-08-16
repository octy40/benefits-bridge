/**
 * Confirms the API key is absent from everything the browser is served.
 *
 * The key is a paid credential on a route with no authentication in front of it,
 * so "we never prefixed it with NEXT_PUBLIC_" is a claim worth re-checking on
 * every build rather than a thing to remember. `npm run build` runs this, which
 * means Vercel runs it too, and a build that would ship the key fails instead.
 *
 * Run it against an existing build on its own with:
 *
 *   npm run check:client-bundle
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Server code is deliberately not scanned. `.next/server` holds the compiled
 * route, which contains the literal text `process.env.ANTHROPIC_API_KEY` by
 * design — scanning it would fail every honest build. What is scanned is the
 * client bundle, plus the prerendered HTML and RSC payloads that go down the
 * wire, where an inlined value would actually reach a Resident.
 */
const SERVED_TO_THE_BROWSER = [
  { dir: ".next/static", extensions: /\.(js|mjs|cjs|css|json|map|txt)$/ },
  { dir: ".next/server/app", extensions: /\.(html|rsc|json)$/ },
];

const key = process.env.ANTHROPIC_API_KEY;

const needles = [
  { pattern: "ANTHROPIC_API_KEY", why: "the variable name" },
  { pattern: "sk-ant-", why: "an Anthropic key prefix" },
  ...(key ? [{ pattern: key, why: "the key currently in the environment" }] : []),
];

const hits = [];

for (const { dir, extensions } of SERVED_TO_THE_BROWSER) {
  for await (const file of walk(dir, extensions, dir)) {
    const contents = await readFile(file, "utf8");
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
  console.warn("ANTHROPIC_API_KEY is not set here, so the key's own value was not searched for.");
}

console.log("Clean: no key, key prefix, or variable name in anything served to the browser.");

async function* walk(dir, extensions, root) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    // Only the root being absent means "you haven't built yet". Anything deeper
    // is a real failure and should say so rather than send you to `npm run build`.
    if (dir === root && error.code === "ENOENT") {
      throw new Error(`${root} is missing. Run \`npm run build\` first.`);
    }
    throw error;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path, extensions, root);
    else if (extensions.test(entry.name)) yield path;
  }
}
