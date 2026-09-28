import { describe, it, expect, beforeAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmProposal, files } from "@/db/schema";
import {
  attachProposalFile,
  changeProposalStatus,
  createCompany,
  createOpportunity,
  createProposal,
  updateProposal,
} from "@/modules/crm/actions";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let opportunityId: string;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const c = await createCompany(ctx, { name: "Empresa proposta" });
  if (!c.ok) throw new Error("setup company");
  const o = await createOpportunity(ctx, { companyId: c.data.id, title: "Piloto de teste" });
  if (!o.ok) throw new Error("setup opportunity");
  opportunityId = o.data.id;
  // Zera a sequência do ano corrente para os testes serem previsíveis quando
  // corridos isoladamente. Não afeta outros anos.
  const year = new Date().getUTCFullYear();
  await db.execute(sql`select setval('crm_proposal_seq_' || ${year}, 1, false)`).catch(() => {
    // Sequência ainda não existe (nenhuma proposta gerada este ano) — a função
    // do banco cria sob demanda no primeiro nextval; nada a fazer.
  });
});

describe("createProposal e nextProposalNumber", () => {
  it("numera PROP-YY-001 e PROP-YY-002 sequencialmente no mesmo ano", async () => {
    const p1 = await createProposal(ctx, {
      opportunityId,
      title: "v1",
      valueCents: 1_000_000,
    });
    const p2 = await createProposal(ctx, {
      opportunityId,
      title: "v2",
      valueCents: 2_000_000,
    });
    expect(p1.ok).toBe(true);
    expect(p2.ok).toBe(true);
    if (!p1.ok || !p2.ok) return;
    expect(p1.data.number).toMatch(/^PROP-\d{2}-001$/);
    expect(p2.data.number).toMatch(/^PROP-\d{2}-002$/);
  });

  it("proposta nasce como rascunho, sem anexo, sem enviada/decidida", async () => {
    const p = await createProposal(ctx, {
      opportunityId,
      title: "Nova",
      valueCents: 5_000_000,
    });
    if (!p.ok) throw new Error("setup");
    const row = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, p.data.id) });
    expect(row?.status).toBe("draft");
    expect(row?.fileId).toBeNull();
    expect(row?.sentAt).toBeNull();
    expect(row?.decidedAt).toBeNull();
  });

  it("rejeita valor zero", async () => {
    const r = await createProposal(ctx, { opportunityId, title: "Zero", valueCents: 0 });
    expect(r.ok).toBe(false);
  });
});

describe("updateProposal", () => {
  it("edita rascunho e recusa edição depois de sent", async () => {
    const p = await createProposal(ctx, {
      opportunityId,
      title: "Editável",
      valueCents: 1_000_000,
    });
    if (!p.ok) throw new Error("setup");
    const ok1 = await updateProposal(ctx, p.data.id, {
      opportunityId,
      title: "Editada",
      valueCents: 1_200_000,
    });
    expect(ok1.ok).toBe(true);

    // Anexa arquivo (fake row direto no banco: os testes de anexo via FormData
    // ficam em uma seção própria) e envia.
    const [f] = await db
      .insert(files)
      .values({
        bucketKey: `test/${p.data.id}.pdf`,
        originalName: "prop.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        uploadedBy: ctx.user.id,
      })
      .returning({ id: files.id });
    await db.update(crmProposal).set({ fileId: f.id }).where(eq(crmProposal.id, p.data.id));

    const sent = await changeProposalStatus(ctx, p.data.id, {
      to: "sent",
      sentAt: "2026-09-27",
      validUntil: "2026-10-27",
    });
    expect(sent.ok).toBe(true);

    const ok2 = await updateProposal(ctx, p.data.id, {
      opportunityId,
      title: "Depois",
      valueCents: 1_500_000,
    });
    expect(ok2.ok).toBe(false);
    if (ok2.ok) return;
    expect(ok2.fieldErrors?.status).toBeDefined();
  });
});

describe("changeProposalStatus", () => {
  it("draft → sent sem file_id falha com fieldError em status", async () => {
    const p = await createProposal(ctx, { opportunityId, title: "Sem anexo", valueCents: 900_000 });
    if (!p.ok) throw new Error("setup");
    const r = await changeProposalStatus(ctx, p.data.id, { to: "sent" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors?.status).toBeDefined();
    expect(r.error).toMatch(/anexado/);
  });

  it("draft → sent com file grava sentAt e audit crm.proposal.sent", async () => {
    const p = await createProposal(ctx, { opportunityId, title: "Com anexo", valueCents: 900_000 });
    if (!p.ok) throw new Error("setup");
    const [f] = await db
      .insert(files)
      .values({
        bucketKey: `test/${p.data.id}-sent.pdf`,
        originalName: "prop.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        uploadedBy: ctx.user.id,
      })
      .returning({ id: files.id });
    await db.update(crmProposal).set({ fileId: f.id }).where(eq(crmProposal.id, p.data.id));

    const r = await changeProposalStatus(ctx, p.data.id, {
      to: "sent",
      sentAt: "2026-09-27",
      validUntil: "2026-10-27",
    });
    expect(r.ok).toBe(true);
    const row = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, p.data.id) });
    expect(row?.sentAt).not.toBeNull();
    expect(row?.validUntil).toBe("2026-10-27");
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, p.data.id));
    expect(audits.some((a) => a.action === "crm.proposal.sent")).toBe(true);
  });

  it("sent → accepted grava decidedAt e decisionNotes", async () => {
    const p = await createProposal(ctx, { opportunityId, title: "A aceitar", valueCents: 900_000 });
    if (!p.ok) throw new Error("setup");
    const [f] = await db
      .insert(files)
      .values({
        bucketKey: `test/${p.data.id}-accept.pdf`,
        originalName: "prop.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        uploadedBy: ctx.user.id,
      })
      .returning({ id: files.id });
    await db.update(crmProposal).set({ fileId: f.id }).where(eq(crmProposal.id, p.data.id));
    await changeProposalStatus(ctx, p.data.id, { to: "sent", sentAt: "2026-09-27" });
    const r = await changeProposalStatus(ctx, p.data.id, {
      to: "accepted",
      decisionNotes: "aprovado por Marcos em ligação",
    });
    expect(r.ok).toBe(true);
    const row = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, p.data.id) });
    expect(row?.status).toBe("accepted");
    expect(row?.decidedAt).not.toBeNull();
    expect(row?.decisionNotes).toBe("aprovado por Marcos em ligação");
  });

  it("apagar arquivo do módulo files reseta fileId para null e proposta sobrevive", async () => {
    const p = await createProposal(ctx, { opportunityId, title: "Anexo removível", valueCents: 500_000 });
    if (!p.ok) throw new Error("setup");
    const [f] = await db
      .insert(files)
      .values({
        bucketKey: `test/${p.data.id}-del.pdf`,
        originalName: "x.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
        uploadedBy: ctx.user.id,
      })
      .returning({ id: files.id });
    await db.update(crmProposal).set({ fileId: f.id }).where(eq(crmProposal.id, p.data.id));
    await db.delete(files).where(eq(files.id, f.id));
    const row = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, p.data.id) });
    expect(row).not.toBeNull();
    expect(row?.fileId).toBeNull();
  });
});
