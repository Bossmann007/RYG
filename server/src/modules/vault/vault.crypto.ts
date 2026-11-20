import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";

/** Passphrase in HUB_VAULT_KEY. Hashed to the envelope key. Absent key is fail-closed. */
export function chaveEnvelope(): Buffer | null {
  const raw = (process.env.HUB_VAULT_KEY || "").trim();
  if (!raw) {
    return null;
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export type BlobCifrado = {
  iv: string;
  tag: string;
  ciphertext: string;
};

export function cifrar(plain: string, chave: Buffer): BlobCifrado {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, chave, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decifrar(blob: BlobCifrado, chave: Buffer): string {
  const decipher = createDecipheriv(ALGORITMO, chave, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
