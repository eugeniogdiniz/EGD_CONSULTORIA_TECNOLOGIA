import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, parseBearer, hasScope, isScope } from "@/modules/api-keys/keys";

describe("generateApiKey", () => {
  it("gera chave egd_..., prefixo de 12 caracteres e hash sha256", () => {
    const { key, prefix, hash } = generateApiKey();
    expect(key).toMatch(/^egd_[A-Za-z0-9_-]{43}$/);
    expect(prefix).toBe(key.slice(0, 12));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey(key)).toBe(hash);
  });
  it("gera chaves diferentes", () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key);
  });
  it("o hash não contém a chave", () => {
    const { key, hash } = generateApiKey();
    expect(hash).not.toContain(key.slice(4, 20));
  });
});

describe("parseBearer", () => {
  const { key } = generateApiKey();
  it("aceita Bearer com chave válida", () => {
    expect(parseBearer(`Bearer ${key}`)).toBe(key);
  });
  it("recusa ausente, outro esquema e formato errado", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer(`Basic ${key}`)).toBeNull();
    expect(parseBearer("Bearer abc")).toBeNull();
    expect(parseBearer(`Bearer ${key} extra`)).toBeNull();
  });
});

describe("escopos", () => {
  it("hasScope confere pertencimento exato", () => {
    expect(hasScope(["cases:read"], "cases:read")).toBe(true);
    expect(hasScope(["cases:read"], "leads:write")).toBe(false);
    expect(hasScope([], "cases:read")).toBe(false);
  });
  it("isScope recusa escopo desconhecido", () => {
    expect(isScope("cases:read")).toBe(true);
    expect(isScope("admin:*")).toBe(false);
  });
});
