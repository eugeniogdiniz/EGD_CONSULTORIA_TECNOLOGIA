import { createHash, randomBytes } from "node:crypto";

/** O token bruto vai só no e-mail; o banco guarda apenas o hash SHA-256. */
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

export function generateToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}
