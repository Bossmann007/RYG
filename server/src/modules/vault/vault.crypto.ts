import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

declare const vaultNameBrand: unique symbol;
export type VaultName = string & { readonly [vaultNameBrand]: "VaultName" };

declare const secretValueBrand: unique symbol;
export type SecretValue = string & { readonly [secretValueBrand]: "SecretValue" };

export type Ciphertext = {
  readonly iv: string;
  readonly tag: string;
  readonly data: string;
};

const AES_256_GCM = "aes-256-gcm";
const IV_BYTES = 12;

export function deriveVaultKey(passphrase: string | undefined): Buffer | null {
  const raw = (passphrase ?? "").trim();
  if (!raw) {
    return null;
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function seal(key: Buffer, plaintext: string): Ciphertext {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_256_GCM, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
}

export function open(key: Buffer, blob: Ciphertext): string | null {
  try {
    const decipher = createDecipheriv(AES_256_GCM, key, Buffer.from(blob.iv, "base64"));
    decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(blob.data, "base64")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}
