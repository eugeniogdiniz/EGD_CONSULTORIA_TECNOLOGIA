import { it, expect } from "vitest";
import { organizationSchema, inviteSchema, acceptInvitationSchema } from "@/modules/tenancy/validation";

const ORG_ID = "0b8f8a2e-4c1a-4a38-9a5e-2f0d9a1c6b11";

it("normaliza CNPJ com pontuação", () => {
  expect(organizationSchema.parse({ name: "ACME", cnpj: "12.345.678/0001-95" }).cnpj).toBe("12345678000195");
});

it("rejeita CNPJ com tamanho errado", () => {
  expect(organizationSchema.safeParse({ name: "ACME", cnpj: "123" }).success).toBe(false);
});

it("aceita cnpj vazio ou ausente como null", () => {
  expect(organizationSchema.parse({ name: "ACME", cnpj: "" }).cnpj).toBeNull();
  expect(organizationSchema.parse({ name: "ACME" }).cnpj).toBeNull();
});

it("rejeita nome curto e slug com caracteres inválidos", () => {
  expect(organizationSchema.safeParse({ name: "A" }).success).toBe(false);
  expect(organizationSchema.safeParse({ name: "ACME", slug: "Com Espaço" }).success).toBe(false);
});

it("convite normaliza e-mail", () => {
  expect(inviteSchema.parse({ email: " A@B.com ", organizationId: ORG_ID }).email).toBe("a@b.com");
});

it("convite rejeita e-mail inválido e organização não-uuid", () => {
  expect(inviteSchema.safeParse({ email: "nope", organizationId: ORG_ID }).success).toBe(false);
  expect(inviteSchema.safeParse({ email: "a@b.com", organizationId: "1" }).success).toBe(false);
});

it("aceite exige senha de 10+ caracteres", () => {
  const base = { token: "t".repeat(43), name: "Ana" };
  expect(acceptInvitationSchema.safeParse({ ...base, password: "curta" }).success).toBe(false);
  expect(acceptInvitationSchema.safeParse({ ...base, password: "senha-forte-1" }).success).toBe(true);
});
