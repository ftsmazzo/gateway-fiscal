import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Formato: v1:<iv_b64>:<tag_b64>:<data_b64> */
export function encryptBytes(plain: Buffer | Uint8Array, secret: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plain)), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
  return Buffer.from(packed, "utf8");
}

export function decryptBytes(packedBuf: Buffer | Uint8Array, secret: string): Buffer {
  const packed = Buffer.from(packedBuf).toString("utf8");
  if (!packed.startsWith("v1:")) {
    // legado fase 0: bytes crus do .pfx
    return Buffer.from(packedBuf);
  }
  const [, ivB64, tagB64, dataB64] = packed.split(":");
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
}

export function encryptText(plain: string, secret: string): string {
  return encryptBytes(Buffer.from(plain, "utf8"), secret).toString("utf8");
}

export function decryptText(packed: string, secret: string): string {
  if (!packed.startsWith("v1:")) {
    // legado fase 0: base64 simples
    try {
      return Buffer.from(packed, "base64").toString("utf8");
    } catch {
      return packed;
    }
  }
  return decryptBytes(Buffer.from(packed, "utf8"), secret).toString("utf8");
}
