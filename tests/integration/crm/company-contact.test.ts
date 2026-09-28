import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmCompany, organizations } from "@/db/schema";
import {
  archiveCompany,
  archiveContact,
  createCompany,
  createContact,
  linkCompanyToOrganization,
  unarchiveCompany,
  unarchiveContact,
  updateCompany,
  updateContact,
} from "@/modules/crm/actions";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
});

async function auditFor(action: string) {
  return db.select().from(auditLog).where(eq(auditLog.action, action));
}

describe("createCompany", () => {
  it("cria empresa com slug gerado a partir do nome", async () => {
    const r = await createCompany(ctx, { name: "Consórcio URBHIS" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.slug).toBe("consorcio-urbhis");
    const audit = await auditFor("crm.company.created");
    expect(audit.some((a) => a.entityId === r.data.id)).toBe(true);
  });

  it("gera slug único com sufixo quando o nome colide", async () => {
    await createCompany(ctx, { name: "Acme LTDA" });
    const r = await createCompany(ctx, { name: "Acme LTDA" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.slug).toBe("acme-ltda-2");
  });

  it("rejeita CNPJ duplicado com mensagem contendo o nome da outra empresa", async () => {
    await createCompany(ctx, { name: "Primeira", cnpj: "11.222.333/0001-44" });
    const r = await createCompany(ctx, { name: "Segunda", cnpj: "11222333000144" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("Primeira");
    expect(r.fieldErrors?.cnpj).toBeDefined();
  });

  it("recusa nome curto com fieldError em name", async () => {
    const r = await createCompany(ctx, { name: "A" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors?.name).toBeDefined();
  });
});

describe("updateCompany", () => {
  it("atualiza campos e grava crm.company.updated", async () => {
    const c = await createCompany(ctx, { name: "Editável" });
    if (!c.ok) throw new Error("setup");
    const r = await updateCompany(ctx, c.data.id, { name: "Editável", industry: "Consultoria" });
    expect(r.ok).toBe(true);
    const audit = await auditFor("crm.company.updated");
    expect(audit.some((a) => a.entityId === c.data.id)).toBe(true);
    const row = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c.data.id) });
    expect(row?.industry).toBe("Consultoria");
  });

  it("rejeita CNPJ que colide com outra empresa (mas aceita manter o próprio)", async () => {
    const a = await createCompany(ctx, { name: "Empresa X", cnpj: "22.333.444/0001-55" });
    const b = await createCompany(ctx, { name: "Empresa Y", cnpj: "33.444.555/0001-66" });
    if (!a.ok || !b.ok) throw new Error("setup");
    const dup = await updateCompany(ctx, b.data.id, { name: "Empresa Y", cnpj: "22333444000155" });
    expect(dup.ok).toBe(false);
    const ownSame = await updateCompany(ctx, b.data.id, { name: "Empresa Y renomeada", cnpj: "33.444.555/0001-66" });
    expect(ownSame.ok).toBe(true);
  });
});

describe("archive/unarchive company", () => {
  it("archive marca archivedAt; segundo archive falha; unarchive limpa", async () => {
    const c = await createCompany(ctx, { name: "A arquivar" });
    if (!c.ok) throw new Error("setup");
    expect((await archiveCompany(ctx, c.data.id)).ok).toBe(true);
    expect((await archiveCompany(ctx, c.data.id)).ok).toBe(false);
    expect((await unarchiveCompany(ctx, c.data.id)).ok).toBe(true);
    const row = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c.data.id) });
    expect(row?.archivedAt).toBeNull();
  });
});

describe("linkCompanyToOrganization", () => {
  it("vincula à organização existente e depois desvincula", async () => {
    const c = await createCompany(ctx, { name: "A vincular" });
    if (!c.ok) throw new Error("setup");
    const [org] = await db.insert(organizations).values({ name: "Cliente X", slug: "cliente-x" }).returning({ id: organizations.id });
    const link = await linkCompanyToOrganization(ctx, c.data.id, org.id);
    expect(link.ok).toBe(true);
    const linked = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c.data.id) });
    expect(linked?.linkedOrganizationId).toBe(org.id);
    const unlink = await linkCompanyToOrganization(ctx, c.data.id, null);
    expect(unlink.ok).toBe(true);
    const unlinked = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, c.data.id) });
    expect(unlinked?.linkedOrganizationId).toBeNull();
  });

  it("recusa vínculo com organização inexistente", async () => {
    const c = await createCompany(ctx, { name: "Outra" });
    if (!c.ok) throw new Error("setup");
    const r = await linkCompanyToOrganization(ctx, c.data.id, "99999999-9999-4999-8999-999999999999");
    expect(r.ok).toBe(false);
  });
});

describe("createContact e regra de principal único", () => {
  it("cria contato principal e recusa um segundo principal na mesma empresa", async () => {
    const c = await createCompany(ctx, { name: "Empresa com contatos" });
    if (!c.ok) throw new Error("setup");
    const p1 = await createContact(ctx, { companyId: c.data.id, name: "Marcos", role: "primary" });
    expect(p1.ok).toBe(true);
    const p2 = await createContact(ctx, { companyId: c.data.id, name: "Outro", role: "primary" });
    expect(p2.ok).toBe(false);
    if (p2.ok) return;
    expect(p2.fieldErrors?.role).toBeDefined();
    expect(p2.error).toContain("Marcos");
    const p3 = await createContact(ctx, { companyId: c.data.id, name: "Ana", role: "financial" });
    expect(p3.ok).toBe(true);
  });

  it("recusa contato em empresa inexistente", async () => {
    const r = await createContact(ctx, {
      companyId: "99999999-9999-4999-8999-999999999999",
      name: "Fantasma",
    });
    expect(r.ok).toBe(false);
  });
});

describe("updateContact e archive", () => {
  it("promover para principal com outro principal ativo falha", async () => {
    const c = await createCompany(ctx, { name: "Empresa update" });
    if (!c.ok) throw new Error("setup");
    const prim = await createContact(ctx, { companyId: c.data.id, name: "Principal", role: "primary" });
    const outro = await createContact(ctx, { companyId: c.data.id, name: "Outro", role: "technical" });
    if (!prim.ok || !outro.ok) throw new Error("setup");
    const r = await updateContact(ctx, outro.data.id, { companyId: c.data.id, name: "Outro", role: "primary" });
    expect(r.ok).toBe(false);
  });

  it("archive libera slot de principal para unarchive de outro", async () => {
    const c = await createCompany(ctx, { name: "Empresa slot" });
    if (!c.ok) throw new Error("setup");
    const p1 = await createContact(ctx, { companyId: c.data.id, name: "Antigo", role: "primary" });
    if (!p1.ok) throw new Error("setup");
    await archiveContact(ctx, p1.data.id);
    const p2 = await createContact(ctx, { companyId: c.data.id, name: "Novo", role: "primary" });
    expect(p2.ok).toBe(true);
    const back = await unarchiveContact(ctx, p1.data.id);
    expect(back.ok).toBe(false); // p2 já ocupa o papel
  });
});
