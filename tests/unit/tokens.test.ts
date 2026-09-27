import { it, expect } from "vitest";
import { generateToken, hashToken } from "@/modules/tenancy/tokens";

it("gera token url-safe com 43+ caracteres e hash determinístico", () => {
  const { raw, hash } = generateToken();
  expect(raw).toMatch(/^[A-Za-z0-9_-]{43,}$/);
  expect(hashToken(raw)).toBe(hash);
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(generateToken().raw).not.toBe(raw);
});
