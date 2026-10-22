#!/usr/bin/env node
/**
 * Build a signed pack manifest.json from a zip archive.
 *
 * Usage:
 *   node scripts/generate-manifest.mjs \
 *     --id core-ui \
 *     --version 1.0.0 \
 *     --file ./dist-packs/core-ui-1.0.0.zip \
 *     --url core-ui/core-ui-1.0.0.zip \
 *     --entrypoint index.html \
 *     --min-shell 0.1.0 \
 *     --out ./dist-packs/core-ui/manifest.json
 *
 * Requires keys/packs-private.pem (see npm run generate:keys)
 */
import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = arg("id");
const version = arg("version");
const file = arg("file");
const url = arg("url");
const entrypoint = arg("entrypoint", "index.html");
const minShell = arg("min-shell", "0.1.0");
const out = arg("out");
const changelog = arg("changelog", "");
const keyPath = arg("key", join(root, "keys/packs-private.pem"));

if (!id || !version || !file || !url || !out) {
  console.error(
    "Usage: --id --version --file --url --out [--entrypoint] [--min-shell] [--changelog] [--key]",
  );
  process.exit(1);
}

const buf = readFileSync(resolve(file));
const sha256 = createHash("sha256").update(buf).digest("hex");
const privateKey = createPrivateKey(readFileSync(keyPath));
const payload = `${id}:${version}:${sha256}`;
const signature = sign(null, Buffer.from(payload, "utf8"), privateKey).toString("hex");

const manifest = {
  id,
  version,
  url,
  sha256,
  signature,
  entrypoint,
  minShellVersion: minShell,
  changelog: changelog || undefined,
  publishedAt: new Date().toISOString(),
};

mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(resolve(out), JSON.stringify(manifest, null, 2) + "\n");
console.log("Manifest écrit :", resolve(out));
console.log(JSON.stringify(manifest, null, 2));
