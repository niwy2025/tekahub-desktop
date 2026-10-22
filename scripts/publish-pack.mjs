#!/usr/bin/env node
/**
 * Helper: zip a pack folder, sign manifest, print upload instructions.
 *
 * Usage:
 *   node scripts/publish-pack.mjs \
 *     --id core-ui \
 *     --version 1.0.1 \
 *     --src ./example-packs/core-ui \
 *     --out ./dist-packs
 */
import { createHash, createPrivateKey, sign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = arg("id");
const version = arg("version");
const src = arg("src");
const outDir = resolve(arg("out", join(root, "dist-packs")));
const entrypoint = arg("entrypoint", "index.html");
const minShell = arg("min-shell", "0.1.0");
const keyPath = arg("key", join(root, "keys/packs-private.pem"));

if (!id || !version || !src) {
  console.error("Usage: --id --version --src [--out] [--entrypoint] [--min-shell] [--key]");
  process.exit(1);
}
if (!existsSync(keyPath)) {
  console.error("Clé privée manquante. Lance: npm run generate:keys");
  process.exit(1);
}

const packOut = join(outDir, id);
mkdirSync(packOut, { recursive: true });
const zipName = `${id}-${version}.zip`;
const zipPath = join(packOut, zipName);

execFileSync("zip", ["-r", zipPath, "."], { cwd: resolve(src), stdio: "inherit" });

const buf = readFileSync(zipPath);
const sha256 = createHash("sha256").update(buf).digest("hex");
const privateKey = createPrivateKey(readFileSync(keyPath));
const payload = `${id}:${version}:${sha256}`;
const signature = sign(null, Buffer.from(payload, "utf8"), privateKey).toString("hex");

const manifest = {
  id,
  version,
  url: `${id}/${zipName}`,
  sha256,
  signature,
  entrypoint,
  minShellVersion: minShell,
  publishedAt: new Date().toISOString(),
};

const manifestPath = join(packOut, "manifest.json");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log("\nPack prêt :");
console.log(" ", zipPath);
console.log(" ", manifestPath);
console.log("\nUpload sur ton CDN sous PACKS_UPDATE_URL/");
console.log(`  ${id}/manifest.json`);
console.log(`  ${id}/${zipName}`);
