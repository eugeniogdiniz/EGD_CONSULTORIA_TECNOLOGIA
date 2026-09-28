import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmCompany, crmContact, crmOpportunity, leads } from "@/db/schema";
import { convertLead, createCompany } from "@/modules/crm/actions";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
});

async function seedLead(overrides: Partial<{
  name: string;
  email: string;
  company: string | null;
  message: string;
}> = {}) {
  const [row] = await db
    .insert(leads)
    .values({
      name: overrides.name ?? "Ana Ribeiro",
      email: overrides.email ?? "ana@construtorasul.com.br",
      company: overrides.company ?? "Construtora Sul",
      message: overrides.message ?? "Queremos automatizar o fluxo de vistorias.",
      ipHash: "test-hash-000",
    })
    .returning({ id: leads.id });
  return row.id;
}

describe("convertLead — modo create", () => {
  it("cria empresa + contato + oportunidade e atualiza o lead em transação", async () => {
    const leadId = await seedLead();
    const r = await convertLead(ctx, leadId, {
      mode: "create",
      company: { name: "Construtora Sul" },
      contact: { name: "Ana Ribeiro", email: "ana@construtorasul.com.br", role: "primary" },
      opportunity: { title: "Contato pelo site — Ana" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    expect(lead?.status).toBe("converted");
    expect(lead?.convertedCompanyId).toBe(r.data.companyId);
    expect(lead?.convertedContactId).toBe(r.data.contactId);
    expect(lead?.convertedOpportunityId).toBe(r.data.opportunityId);
    expect(lead?.convertedAt).not.toBeNull();
    expect(lead?.convertedBy).toBe(ctx.user.id);

    const opp = await db.query.crmOpportunity.findFirst({
      where: eq(crmOpportunity.id, r.data.opportunityId),
    });
    expect(opp?.primaryContactId).toBe(r.data.contactId);
    expect(opp?.stage).toBe("new");

    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, leadId));
    expect(audits.some((a) => a.action === "crm.lead.converted")).toBe(true);
  });

  it("segunda conversão do mesmo lead falha citando a empresa", async () => {
    const leadId = await seedLead({ email: "primeira@empresa.com.br" });
    const r1 = await convertLead(ctx, leadId, {
      mode: "create",
      company: { name: "Primeira Empresa" },
      contact: { name: "Primeiro" },
      opportunity: { title: "Piloto" },
    });
    expect(r1.ok).toBe(true);
    const r2 = await convertLead(ctx, leadId, {
      mode: "create",
      company: { name: "Segunda" },
      contact: { name: "Segundo" },
      opportunity: { title: "Bis" },
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.error).toContain("Primeira Empresa");
  });

  it("CNPJ duplicado no plano create falha e não escreve nada", async () => {
    await createCompany(ctx, { name: "Ocupa CNPJ", cnpj: "77.888.999/0001-11" });
    const leadId = await seedLead({ email: "lead@x.com.br" });
    const before = await db.select({ id: crmCompany.id }).from(crmCompany);
    const r = await convertLead(ctx, leadId, {
      mode: "create",
      company: { name: "Nova", cnpj: "77888999000111" },
      contact: { name: "Lead" },
      opportunity: { title: "Piloto" },
    });
    expect(r.ok).toBe(false);
    const after = await db.select({ id: crmCompany.id }).from(crmCompany);
    expect(after.length).toBe(before.length); // nada foi inserido
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    expect(lead?.status).toBe("new");
  });
});

describe("convertLead — modo link", () => {
  it("vincula lead a empresa existente e não cria duplicata", async () => {
    const co = await createCompany(ctx, { name: "Empresa Existente" });
    if (!co.ok) throw new Error("setup");
    const leadId = await seedLead({ email: "novo@existente.com.br" });
    const before = await db.select({ id: crmCompany.id }).from(crmCompany);
    const r = await convertLead(ctx, leadId, {
      mode: "link",
      companyId: co.data.id,
      contact: { name: "Novo Contato", role: "primary" },
      opportunity: { title: "Segundo negócio" },
    });
    expect(r.ok).toBe(true);
    const after = await db.select({ id: crmCompany.id }).from(crmCompany);
    expect(after.length).toBe(before.length);
    if (r.ok) expect(r.data.companyId).toBe(co.data.id);
  });

  it("auto-downgrade de principal para 'other' quando já existe principal", async () => {
    const co = await createCompany(ctx, { name: "Já tem principal" });
    if (!co.ok) throw new Error("setup");
    const leadId1 = await seedLead({ email: "primeiro@principal.com.br" });
    await convertLead(ctx, leadId1, {
      mode: "link",
      companyId: co.data.id,
      contact: { name: "Principal Atual", role: "primary" },
      opportunity: { title: "Piloto A" },
    });
    const leadId2 = await seedLead({ email: "segundo@principal.com.br" });
    const r = await convertLead(ctx, leadId2, {
      mode: "link",
      companyId: co.data.id,
      contact: { name: "Segundo Chega", role: "primary" },
      opportunity: { title: "Piloto B" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const created = await db.query.crmContact.findFirst({ where: eq(crmContact.id, r.data.contactId) });
    expect(created?.role).toBe("other");
  });

  it("falha se companyId aponta para empresa inexistente", async () => {
    const leadId = await seedLead({ email: "fantasma@nada.com.br" });
    const r = await convertLead(ctx, leadId, {
      mode: "link",
      companyId: "99999999-9999-4999-8999-999999999999",
      contact: { name: "Fantasma" },
      opportunity: { title: "Nada" },
    });
    expect(r.ok).toBe(false);
  });
});
