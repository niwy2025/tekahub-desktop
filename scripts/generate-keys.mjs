#!/usr/bin/env node
/**
 * Generate Ed25519 key pair for pack signing.
 * Private key stays in keys/ (gitignored). Public key → paste into PACKS_PUBLIC_KEY.
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = join(root, "keys");
mkdirSync(keysDir, { recursive: true });

const privatePath = join(keysDir, "packs-private.pem");
const publicPath = join(keysDir, "packs-public.pem");
const publicB64Path = join(keysDir, "packs-public.b64.txt");

if (existsSync(privatePath)) {
  console.error("keys/packs-private.pem existe déjà — abort (ne pas écraser).");
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
const pubPem = publicKey.export({ type: "spki", format: "pem" });
const pubDer = publicKey.export({ type: "spki", format: "der" });

writeFileSync(privatePath, privPem);
writeFileSync(publicPath, pubPem);
writeFileSync(publicB64Path, pubDer.toString("base64") + "\n");

console.log("Clés générées :");
console.log("  privée :", privatePath, "(NE PAS COMMITTER)");
console.log("  publique PEM :", publicPath);
console.log("  publique base64 (PACKS_PUBLIC_KEY) :", publicB64Path);
console.log("\nAjoute dans .env :");
console.log(`PACKS_PUBLIC_KEY=${pubDer.toString("base64")}`);
