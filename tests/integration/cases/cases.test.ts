import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, siteCase } from "@/db/schema";
import { createCase, deleteCase, setCasePublished, updateCase } from "@/modules/cases/actions";
import { getPublishedTotals, listPublishedCases } from "@/modules/cases/queries";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
});

// A migration semeia os cases reais do site: o teste só cria e remove linhas "Zz Teste".
const TEST_SLUG = "zz-teste%";
const cleanup = () => db.delete(siteCase).where(like(siteCase.slug, TEST_SLUG));
beforeEach(cleanup);
afterAll(cleanup);
const mine = async () => (await listPublishedCases()).filter((c) => c.id.startsWith("zz-teste")).map((c) => c.nome);

const base = {
  name: "Zz Teste Acme",
  sector: "Energia",
  size: "medium" as const,
  systems: "2",
  automations: "5",
  savings: "1.234,56",
  capex: "500,00",
  featured: true,
  published: true,
  deliverables: "GED\nVistoria\n",
  statusNote: "",
};

describe("createCase", () => {
  it("cria com slug do nome, converte reais em centavos e separa as entregas", async () => {
    const r = await createCase(ctx, base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.slug).toBe("zz-teste-acme");
    const row = await db.query.siteCase.findFirst({ where: eq(siteCase.id, r.data.id) });
    expect(row?.savingsCents).toBe(123456);
    expect(row?.capexCents).toBe(50000);
    expect(row?.deliverables).toEqual(["GED", "Vistoria"]);
    expect(row?.statusNote).toBeNull();
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "case.created"));
    expect(audits.some((a) => a.entityId === r.data.id)).toBe(true);
  });

  it("gera slug único quando o nome se repete", async () => {
    await createCase(ctx, base);
    const r = await createCase(ctx, base);
    expect(r.ok && r.data.slug).toBe("zz-teste-acme-2");
  });

  it("recusa valor monetário inválido e nome curto", async () => {
    const r = await createCase(ctx, { ...base, name: "A", savings: "abc" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors?.name).toBeDefined();
    expect(r.fieldErrors?.savings).toBeDefined();
  });

  it("recusa mais de 12 entregas", async () => {
    const r = await createCase(ctx, { ...base, deliverables: Array.from({ length: 13 }, (_, i) => `E${i}`).join("\n") });
    expect(r.ok).toBe(false);
  });
});

describe("updateCase / publicação / exclusão", () => {
  it("edita sem trocar o slug", async () => {
    const c = await createCase(ctx, base);
    if (!c.ok) throw new Error("falhou");
    expect((await updateCase(ctx, c.data.id, { ...base, name: "Outro nome", savings: "10,00" })).ok).toBe(true);
    const row = await db.query.siteCase.findFirst({ where: eq(siteCase.id, c.data.id) });
    expect(row?.name).toBe("Outro nome");
    expect(row?.slug).toBe("zz-teste-acme");
    expect(row?.savingsCents).toBe(1000);
  });

  it("despublicar tira do site e dos totais; publicar devolve", async () => {
    const before = await getPublishedTotals();
    const a = await createCase(ctx, { ...base, name: "Zz Teste Alfa", savings: "100,00" });
    await createCase(ctx, { ...base, name: "Zz Teste Beta", savings: "300,00" });
    if (!a.ok) throw new Error("falhou");
    const both = await getPublishedTotals();
    expect(both.clientes).toBe(before.clientes + 2);
    expect(both.economia).toBeCloseTo(before.economia + 400, 2);

    await setCasePublished(ctx, a.data.id, false);
    expect(await mine()).toEqual(["Zz Teste Beta"]);
    expect((await getPublishedTotals()).clientes).toBe(before.clientes + 1);

    await setCasePublished(ctx, a.data.id, true);
    expect(await mine()).toEqual(["Zz Teste Beta", "Zz Teste Alfa"]);
  });

  it("ordena por economia decrescente", async () => {
    await createCase(ctx, { ...base, name: "Zz Teste Pequeno", savings: "10,00" });
    await createCase(ctx, { ...base, name: "Zz Teste Grande", savings: "9.999,00" });
    expect(await mine()).toEqual(["Zz Teste Grande", "Zz Teste Pequeno"]);
  });

  it("exclui e recusa id inexistente ou inválido", async () => {
    const c = await createCase(ctx, base);
    if (!c.ok) throw new Error("falhou");
    expect((await deleteCase(ctx, c.data.id)).ok).toBe(true);
    expect((await deleteCase(ctx, c.data.id)).ok).toBe(false);
    expect((await updateCase(ctx, "nao-uuid", base)).ok).toBe(false);
  });
});
