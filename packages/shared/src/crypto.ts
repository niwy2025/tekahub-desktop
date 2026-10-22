import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

/** Canonical payload signed for pack integrity. */
export function packSignPayload(id: string, version: string, sha256: string): string {
  return `${id}:${version}:${sha256}`;
}

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Sign with Ed25519 private key PEM.
 * Returns hex signature.
 */
export function signPayload(privateKeyPem: string, payload: string): string {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(payload, "utf8"), key).toString("hex");
}

/**
 * Verify Ed25519 signature. Public key may be PEM or raw hex (32-byte SPKI-unwrapped not supported —
 * prefer PEM or base64 DER SPKI).
 */
export function verifyPayload(
  publicKeyPemOrBase64: string,
  payload: string,
  signatureHex: string,
): boolean {
  try {
    const key = normalizePublicKey(publicKeyPemOrBase64);
    return verify(null, Buffer.from(payload, "utf8"), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

function normalizePublicKey(input: string) {
  const trimmed = input.trim();
  if (trimmed.includes("BEGIN PUBLIC KEY")) {
    return createPublicKey(trimmed);
  }
  // Assume base64 SPKI DER
  return createPublicKey({
    key: Buffer.from(trimmed, "base64"),
    format: "der",
    type: "spki",
  });
}

export function verifyPackManifest(
  publicKey: string,
  id: string,
  version: string,
  sha256: string,
  signatureHex: string,
): boolean {
  return verifyPayload(publicKey, packSignPayload(id, version, sha256), signatureHex);
}
