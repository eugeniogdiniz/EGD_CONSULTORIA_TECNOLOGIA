import { it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));

import { submitContact } from "@/modules/leads/actions";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const valid = { name: "Ana", email: "ana@test.local", message: "Quero um orçamento para automação." };

it("grava lead válido", async () => {
  const r = await submitContact(null, fd(valid));
  expect(r?.ok).toBe(true);
  const rows = await db.select().from(leads);
  expect(rows.some((l) => l.email === "ana@test.local" && l.status === "new" && l.source === "site_contact")).toBe(true);
});

it("honeypot preenchido responde ok sem gravar", async () => {
  const before = (await db.select().from(leads)).length;
  const r = await submitContact(null, fd({ ...valid, email: "bot@test.local", website: "http://spam" }));
  expect(r?.ok).toBe(true);
  expect((await db.select().from(leads)).length).toBe(before);
});

it("mensagem longa devolve erro de campo", async () => {
  const r = await submitContact(null, fd({ ...valid, message: "a".repeat(4001) }));
  expect(r?.ok).toBe(false);
  if (r && !r.ok) expect(r.fieldErrors?.message).toBeTruthy();
});

it("quarto envio do mesmo IP na hora é bloqueado", async () => {
  // o 1º envio válido deste arquivo já contou; mais dois passam, o quarto cai
  expect((await submitContact(null, fd(valid)))?.ok).toBe(true);
  expect((await submitContact(null, fd(valid)))?.ok).toBe(true);
  const r = await submitContact(null, fd(valid));
  expect(r?.ok).toBe(false);
  if (r && !r.ok) expect(r.fieldErrors).toBeUndefined();
});
