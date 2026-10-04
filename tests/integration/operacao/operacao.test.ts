import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appError, auditLog, crmCompany, crmProposal, crmOpportunity, crmService, notification, rateLimitBucket } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { captureError } from "@/modules/errors/capture";
import { listErrors } from "@/modules/errors/queries";
import { resolveError } from "@/modules/errors/actions";
import { createPgRateLimiter, sweepRateLimitBuckets } from "@/lib/rate-limit";
import { listBackupFolders, pruneOldBackups, readManifest, runBackup } from "@/modules/backup/run";
import { restoreTables } from "@/modules/backup/restore";
import { searchAll } from "@/modules/search/queries";
import { listObjects } from "@/lib/storage";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
beforeAll(async () => {
  admin = await ensureTestAdmin();
  await db.delete(appError);
  await db.delete(rateLimitBucket);
});

describe("erros", () => {
  it("agrupa ocorrências, reabre resolvido e audita a resolução", async () => {
    const boom = () => new Error("Falha ao gravar o pedido 42");
    const a = await captureError(boom(), { path: "/admin/x", method: "GET" });
    const b = await captureError(boom(), { path: "/admin/x", method: "GET" });
    expect(a?.isNew).toBe(true);
    expect(b?.isNew).toBe(false);
    expect(a?.fingerprint).toBe(b?.fingerprint);
    let open = await listErrors(admin);
    expect(open.find((e) => e.fingerprint === a!.fingerprint)?.count).toBe(2);
    expect((await resolveError(admin, a!.id)).ok).toBe(true);
    expect((await listErrors(admin)).some((e) => e.id === a!.id)).toBe(false);
    expect((await listErrors(admin, { resolved: true })).some((e) => e.id === a!.id)).toBe(true);
    const c = await captureError(boom(), { path: "/admin/x", method: "GET" });
    expect(c?.isNew).toBe(false);
    open = await listErrors(admin);
    expect(open.find((e) => e.id === a!.id)?.count).toBe(3);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "error.resolved"))).toHaveLength(1);
  });
});

describe("limite de taxa no banco", () => {
  it("duas instâncias compartilham a contagem; reset zera; sweep apaga janelas velhas", async () => {
    const a = createPgRateLimiter(db, { scope: "t", windowMs: 60_000, max: 3 });
    const b = createPgRateLimiter(db, { scope: "t", windowMs: 60_000, max: 3 });
    const now = Date.UTC(2026, 9, 3, 12, 0, 5);
    expect((await a.hit("k", now)).allowed).toBe(true);
    expect((await b.hit("k", now)).allowed).toBe(true);
    expect((await a.hit("k", now)).remaining).toBe(0);
    expect((await b.hit("k", now)).allowed).toBe(false);
    expect((await a.hit("k", now + 60_000)).allowed).toBe(true); // janela nova
    await a.reset("k");
    expect((await b.hit("k", now)).allowed).toBe(true);
    await a.hit("velha", now - 3 * 86_400_000);
    expect(await sweepRateLimitBuckets(db, new Date(now - 2 * 86_400_000))).toBeGreaterThanOrEqual(1);
    expect((await db.select().from(rateLimitBucket)).some((r) => r.key === "t:velha")).toBe(false);
  });
});

describe("backup lógico e restauração", () => {
  it("grava uma pasta por dia com manifest, apaga pastas antigas e restaura uma tabela", async () => {
    const [svc] = await db.insert(crmService).values({ name: "Serviço backup", unit: "h", defaultPriceCents: 12345 }).returning();
    const r = await runBackup(new Date("2026-10-03T06:30:00Z"), "2026-10-03");
    expect(r.tables).toBeGreaterThan(10);
    const keys = (await listObjects("backups/2026-10-03/")).map((o) => o.key);
    expect(keys).toContain("backups/2026-10-03/manifest.json");
    expect(keys).toContain("backups/2026-10-03/crm_service.json.gz");
    const manifest = await readManifest("2026-10-03");
    expect(manifest?.tables.find((t) => t.table === "crm_service")?.rows).toBeGreaterThanOrEqual(1);
    // retenção: pasta antiga some, a de hoje fica
    await runBackup(new Date("2026-09-01T06:30:00Z"), "2026-09-01");
    expect((await listBackupFolders()).map((f) => f.date)).toContain("2026-09-01");
    expect(await pruneOldBackups("2026-10-03")).toBeGreaterThanOrEqual(1);
    expect((await listBackupFolders()).map((f) => f.date)).not.toContain("2026-09-01");
    // restauração: apaga a linha e repõe a partir do backup
    await db.delete(crmService).where(eq(crmService.id, svc.id));
    const res = await restoreTables("2026-10-03", { only: ["crm_service"] });
    expect(res.restored).toEqual([{ table: "crm_service", rows: expect.any(Number) }]);
    const back = await db.query.crmService.findFirst({ where: eq(crmService.id, svc.id) });
    expect(back?.name).toBe("Serviço backup");
  });
});

describe("busca global", () => {
  it("acha por nome e número; colaborador não vê grupos do dono", async () => {
    const stamp = Date.now();
    const [c] = await db.insert(crmCompany).values({ name: `Zeta ${stamp} Busca`, slug: `zeta-${stamp}`, ownerId: admin.user.id }).returning({ id: crmCompany.id });
    const [opp] = await db.insert(crmOpportunity).values({ companyId: c.id, title: `Op Zeta ${stamp}`, stage: "new", ownerId: admin.user.id }).returning({ id: crmOpportunity.id });
    await db.insert(crmProposal).values({ number: `PROP-99-${String(stamp).slice(-3)}`, opportunityId: opp.id, title: `Proposta Zeta ${stamp}`, valueCents: 1, ownerId: admin.user.id });
    const g = await searchAll(admin, `Zeta ${stamp}`);
    expect(g.map((x) => x.key)).toEqual(expect.arrayContaining(["companies", "opportunities", "proposals"]));
    expect(g.find((x) => x.key === "companies")?.hits[0].href).toBe(`/admin/crm/empresas/${c.id}`);
    expect(await searchAll(admin, "Z")).toEqual([]);
    const colab: AdminContext = { kind: "admin", user: { ...admin.user, role: "collaborator" } };
    expect((await searchAll(colab, `Zeta ${stamp}`)).every((x) => !["companies", "opportunities", "proposals", "organizations", "contacts"].includes(x.key))).toBe(true);
    void notification;
  });
});
