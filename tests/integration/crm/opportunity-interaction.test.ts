import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmInteraction, crmOpportunity } from "@/db/schema";
import {
  changeOpportunityStage,
  createCompany,
  createContact,
  createInteraction,
  createOpportunity,
  deleteInteraction,
  updateInteraction,
  updateOpportunity,
} from "@/modules/crm/actions";
import { listInteractions } from "@/modules/crm/queries";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let companyId: string;
let contactId: string;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const c = await createCompany(ctx, { name: "Empresa para oportunidades" });
  if (!c.ok) throw new Error("setup company");
  companyId = c.data.id;
  const p = await createContact(ctx, { companyId, name: "Contato Principal" });
  if (!p.ok) throw new Error("setup contact");
  contactId = p.data.id;
});

describe("createOpportunity", () => {
  it("cria oportunidade com companyId e contato principal válidos", async () => {
    const r = await createOpportunity(ctx, {
      companyId,
      primaryContactId: contactId,
      title: "Piloto",
    });
    expect(r.ok).toBe(true);
  });

  it("rejeita contato principal de outra empresa", async () => {
    const outra = await createCompany(ctx, { name: "Outra Empresa" });
    if (!outra.ok) throw new Error("setup");
    const r = await createOpportunity(ctx, {
      companyId: outra.data.id,
      primaryContactId: contactId,
      title: "Cross",
    });
    expect(r.ok).toBe(false);
  });
});

describe("updateOpportunity", () => {
  it("não permite mover para outra empresa", async () => {
    const other = await createCompany(ctx, { name: "Nova casa" });
    if (!other.ok) throw new Error("setup");
    const opp = await createOpportunity(ctx, { companyId, title: "Fixa" });
    if (!opp.ok) throw new Error("setup");
    const r = await updateOpportunity(ctx, opp.data.id, { companyId: other.data.id, title: "Fixa" });
    expect(r.ok).toBe(false);
  });
});

describe("changeOpportunityStage", () => {
  it("won grava wonAt e zera lostAt/lostReason; auditoria carrega from/to", async () => {
    const opp = await createOpportunity(ctx, { companyId, title: "A vencer" });
    if (!opp.ok) throw new Error("setup");
    const r = await changeOpportunityStage(ctx, opp.data.id, { to: "won" });
    expect(r.ok).toBe(true);
    const row = await db.query.crmOpportunity.findFirst({ where: eq(crmOpportunity.id, opp.data.id) });
    expect(row?.stage).toBe("won");
    expect(row?.wonAt).not.toBeNull();
    expect(row?.lostAt).toBeNull();
    const events = await db.select().from(auditLog).where(eq(auditLog.entityId, opp.data.id));
    const won = events.find((e) => e.action === "crm.opportunity.won");
    expect(won).toBeDefined();
    expect(won!.metadata).toMatchObject({ from: "new", to: "won" });
  });

  it("lost exige motivo — sem motivo, fieldError em lostReason", async () => {
    const opp = await createOpportunity(ctx, { companyId, title: "Perder" });
    if (!opp.ok) throw new Error("setup");
    const r = await changeOpportunityStage(ctx, opp.data.id, { to: "lost" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors?.lostReason).toBeDefined();
  });

  it("lost com motivo grava lostAt, lostReason e metadata.reason", async () => {
    const opp = await createOpportunity(ctx, { companyId, title: "Perdida" });
    if (!opp.ok) throw new Error("setup");
    const r = await changeOpportunityStage(ctx, opp.data.id, { to: "lost", lostReason: "sem orçamento" });
    expect(r.ok).toBe(true);
    const row = await db.query.crmOpportunity.findFirst({ where: eq(crmOpportunity.id, opp.data.id) });
    expect(row?.lostAt).not.toBeNull();
    expect(row?.lostReason).toBe("sem orçamento");
    const events = await db.select().from(auditLog).where(eq(auditLog.entityId, opp.data.id));
    const lost = events.find((e) => e.action === "crm.opportunity.lost");
    expect(lost!.metadata).toMatchObject({ from: "new", to: "lost", reason: "sem orçamento" });
  });

  it("reabrir zera wonAt/lostAt/lostReason", async () => {
    const opp = await createOpportunity(ctx, { companyId, title: "Reabrir" });
    if (!opp.ok) throw new Error("setup");
    await changeOpportunityStage(ctx, opp.data.id, { to: "won" });
    await changeOpportunityStage(ctx, opp.data.id, { to: "qualified" });
    const row = await db.query.crmOpportunity.findFirst({ where: eq(crmOpportunity.id, opp.data.id) });
    expect(row?.stage).toBe("qualified");
    expect(row?.wonAt).toBeNull();
    expect(row?.lostAt).toBeNull();
    expect(row?.lostReason).toBeNull();
  });

  it("mesmo estágio não grava evento e retorna ok(null)", async () => {
    const opp = await createOpportunity(ctx, { companyId, title: "Idempotente" });
    if (!opp.ok) throw new Error("setup");
    const before = (await db.select().from(auditLog).where(eq(auditLog.entityId, opp.data.id))).length;
    const r = await changeOpportunityStage(ctx, opp.data.id, { to: "new" });
    expect(r.ok).toBe(true);
    const after = (await db.select().from(auditLog).where(eq(auditLog.entityId, opp.data.id))).length;
    expect(after).toBe(before);
  });
});

describe("createInteraction", () => {
  it("aceita ancorada em empresa", async () => {
    const r = await createInteraction(ctx, {
      type: "note",
      at: "2026-09-27T14:00:00Z",
      summary: "Ping",
      companyId,
    });
    expect(r.ok).toBe(true);
  });

  it("rejeita sem âncora com fieldError em companyId", async () => {
    const r = await createInteraction(ctx, {
      type: "note",
      at: "2026-09-27T14:00:00Z",
      summary: "Sem casa",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors?.companyId).toBeDefined();
  });

  it("check constraint do banco pega tentativa direta (defesa em profundidade)", async () => {
    // Se alguém contornar o Zod, o banco recusa (drizzle envelopa o erro do Postgres).
    let err: Error | null = null;
    try {
      await db.insert(crmInteraction).values({
        type: "note",
        at: new Date(),
        byUserId: ctx.user.id,
        summary: "Direto",
      });
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    const chain = String((err as { cause?: unknown })?.cause ?? err);
    expect(chain).toMatch(/crm_interaction_has_anchor/);
  });
});

describe("updateInteraction e deleteInteraction (soft)", () => {
  it("update funciona antes do delete e falha depois", async () => {
    const created = await createInteraction(ctx, {
      type: "note",
      at: "2026-09-27T14:00:00Z",
      summary: "Original",
      companyId,
    });
    if (!created.ok) throw new Error("setup");
    const upd = await updateInteraction(ctx, created.data.id, {
      type: "note",
      at: "2026-09-27T14:00:00Z",
      summary: "Editado",
      companyId,
    });
    expect(upd.ok).toBe(true);
    const del = await deleteInteraction(ctx, created.data.id);
    expect(del.ok).toBe(true);
    const upd2 = await updateInteraction(ctx, created.data.id, {
      type: "note",
      at: "2026-09-27T14:00:00Z",
      summary: "Depois",
      companyId,
    });
    expect(upd2.ok).toBe(false);
  });

  it("interação soft-deletada some de listInteractions", async () => {
    const created = await createInteraction(ctx, {
      type: "call",
      at: "2026-09-27T14:00:00Z",
      summary: "Some",
      companyId,
    });
    if (!created.ok) throw new Error("setup");
    const before = await listInteractions(ctx, { companyId });
    expect(before.some((i) => i.id === created.data.id)).toBe(true);
    await deleteInteraction(ctx, created.data.id);
    const after = await listInteractions(ctx, { companyId });
    expect(after.some((i) => i.id === created.data.id)).toBe(false);
  });
});
