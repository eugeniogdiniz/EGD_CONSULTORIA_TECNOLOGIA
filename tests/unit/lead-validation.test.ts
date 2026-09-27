import { it, expect } from "vitest";
import { leadSchema } from "@/modules/leads/validation";

const base = { name: "Ana", email: "ana@x.com", message: "Olá, quero um orçamento." };

it("aceita lead mínimo", () => {
  expect(leadSchema.safeParse(base).success).toBe(true);
});

it("rejeita mensagem acima de 4000 caracteres e abaixo de 10", () => {
  expect(leadSchema.safeParse({ ...base, message: "a".repeat(4001) }).success).toBe(false);
  expect(leadSchema.safeParse({ ...base, message: "curta" }).success).toBe(false);
});

it("normaliza e-mail e trata empresa/telefone vazios ou ausentes como null", () => {
  const out = leadSchema.parse({ ...base, email: " ANA@X.com ", company: "", phone: undefined });
  expect(out.email).toBe("ana@x.com");
  expect(out.company).toBeNull();
  expect(out.phone).toBeNull();
});

it("rejeita nome curto e e-mail inválido com erro por campo", () => {
  const r = leadSchema.safeParse({ ...base, name: "A", email: "nope" });
  expect(r.success).toBe(false);
  if (!r.success) {
    const paths = r.error.issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("email");
  }
});
