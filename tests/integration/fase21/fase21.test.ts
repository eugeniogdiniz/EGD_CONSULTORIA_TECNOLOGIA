import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKey, auditLog, crmCompany, crmOpportunity, jobSetting, notification, project, projectDeliverable, webhookDelivery, webhookEndpoint } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { setJobSchedule } from "@/modules/jobs/actions";
import { listJobSettings } from "@/modules/jobs/queries";
import { applyOverride, isDue } from "@/modules/jobs/schedule";
import { getJob } from "@/modules/jobs/registry";
import { createWebhook, setWebhookActive, testWebhook } from "@/modules/webhooks/actions";
import { enqueueWebhook } from "@/modules/webhooks/queue";
import { deliverOne, processWebhookDeliveries } from "@/modules/webhooks/deliver";
import { verifyWebhook } from "@/modules/webhooks/sign";
import { listDeliveries } from "@/modules/webhooks/queries";
import { createApiKey, rotateApiKey } from "@/modules/api-keys/actions";
import { authenticateApiKey } from "@/modules/api-keys/auth";
import { writeDailySnapshot, loadSnapshotsUpTo } from "@/modules/reports/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let server: Server;
let port: number;
const received: { headers: Record<string, string | string[] | undefined>; body: string }[] = [];
let mode: "ok" | "fail" = "ok";

beforeAll(async () => {
  admin = await ensureTestAdmin();
  await db.delete(webhookDelivery);
  await db.delete(webhookEndpoint);
  await db.delete(jobSetting);
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push({ headers: req.headers, body });
      res.statusCode = mode === "ok" ? 200 : 500;
      res.end(mode === "ok" ? "ok" : "erro");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  port = (server.address() as { port: number }).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("horário por automação", () => {
  it("salva, sobrescreve a agenda e volta ao padrão com vazio", async () => {
    const job = getJob("resumo-diario")!;
    expect((await setJobSchedule(admin, "resumo-diario", "10:30")).ok).toBe(true);
    const s = (await listJobSettings()).get("resumo-diario");
    expect(s).toMatchObject({ enabled: true, hour: 10, minute: 30 });
    const at = new Date("2026-10-02T12:00:00Z"); // 09:00 SP, sexta
    expect(isDue(job.schedule, at)).toBe(true);
    expect(isDue(applyOverride(job.schedule, s), at)).toBe(false);
    expect((await setJobSchedule(admin, "resumo-diario", "25:00")).ok).toBe(false);
    expect((await setJobSchedule(admin, "resumo-diario", "")).ok).toBe(true);
    expect((await listJobSettings()).get("resumo-diario")?.hour).toBeNull();
  });
});

describe("webhooks de saída", () => {
  it("entrega assinada a um servidor local; falha agenda nova tentativa; teste manual funciona", async () => {
    const created = await createWebhook(admin, { name: "Eco local", url: `http://127.0.0.1:${port}/hook`, events: ["lead.created", "proposal.sent"] });
    expect(created.ok).toBe(true);
    const { id, secret } = (created.ok ? created.data : null)!;
    expect(secret.startsWith("whsec_")).toBe(true);

    // evento não inscrito não enfileira; inscrito enfileira
    expect(await enqueueWebhook("invoice.paid", { x: 1 })).toBe(0);
    expect(await enqueueWebhook("lead.created", { id: "l1", name: "Ana" })).toBe(1);
    // relógio um pouco à frente: nunca depende de o banco e o app estarem no mesmo milissegundo
    const r = await processWebhookDeliveries(new Date(Date.now() + 2000));
    expect(r).toEqual({ processed: 1, ok: 1 });
    const last = received.at(-1)!;
    expect(last.headers["x-egd-event"]).toBe("lead.created");
    const ts = Number(last.headers["x-egd-timestamp"]);
    expect(verifyWebhook(secret, ts, last.body, String(last.headers["x-egd-signature"]), ts * 1000)).toBe(true);
    expect(JSON.parse(last.body).data.name).toBe("Ana");

    // falha → pendente com próxima tentativa em ~1 min; depois ok ao reenviar
    mode = "fail";
    await enqueueWebhook("proposal.sent", { id: "p1" });
    const now = new Date(Date.now() + 2000);
    await processWebhookDeliveries(now);
    let deliveries = await listDeliveries(admin, id);
    const failed = deliveries.find((d) => d.event === "proposal.sent")!;
    expect(failed.status).toBe("pending");
    expect(failed.attempts).toBe(1);
    expect(failed.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime() + 50_000);
    expect((await db.query.webhookEndpoint.findFirst({ where: eq(webhookEndpoint.id, id) }))?.failureCount).toBe(1);
    mode = "ok";
    const again = await deliverOne(failed.id, new Date(failed.nextAttemptAt.getTime() + 1000));
    expect(again?.ok).toBe(true);
    expect((await db.query.webhookEndpoint.findFirst({ where: eq(webhookEndpoint.id, id) }))?.failureCount).toBe(0);

    // teste manual (ping) entrega na hora
    const t = await testWebhook(admin, id);
    expect(t.ok && t.data.ok).toBe(true);
    deliveries = await listDeliveries(admin, id);
    expect(deliveries.some((d) => d.event === "ping" && d.status === "ok")).toBe(true);

    // 20 falhas seguidas desativam e avisam
    await db.delete(notification);
    await db.update(webhookEndpoint).set({ failureCount: 19 }).where(eq(webhookEndpoint.id, id));
    mode = "fail";
    await enqueueWebhook("lead.created", { id: "l2" });
    await processWebhookDeliveries(new Date(Date.now() + 2000));
    expect((await db.query.webhookEndpoint.findFirst({ where: eq(webhookEndpoint.id, id) }))?.active).toBe(false);
    expect(await db.select().from(notification).where(eq(notification.kind, "webhook.disabled"))).not.toHaveLength(0);
    mode = "ok";
    expect((await setWebhookActive(admin, id, true)).ok).toBe(true);
    expect((await db.query.webhookEndpoint.findFirst({ where: eq(webhookEndpoint.id, id) }))?.failureCount).toBe(0);
    const acts = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, id))).map((x) => x.a);
    expect(acts).toEqual(expect.arrayContaining(["webhook.created", "webhook.tested", "webhook.reactivated"]));
  });
});

describe("chaves de API: validade e rotação", () => {
  const req = (key: string) => new Request("http://x/api/v1/cases", { headers: { authorization: `Bearer ${key}` } });
  it("chave nova expira em 1 ano; rotação mantém a antiga por 7 dias; expirada responde 401", async () => {
    const c = await createApiKey(admin, { name: "Rot", scopes: ["cases:read"] });
    const { id, key } = (c.ok ? c.data : null)!;
    const row = await db.query.apiKey.findFirst({ where: eq(apiKey.id, id) });
    expect(row?.expiresAt).not.toBeNull();
    expect((row!.expiresAt!.getTime() - Date.now()) / 86_400_000).toBeGreaterThan(360);
    expect((await authenticateApiKey(req(key), "cases:read")).ok).toBe(true);

    const rot = await rotateApiKey(admin, id);
    expect(rot.ok).toBe(true);
    const { key: newKey, oldRevokesAt } = (rot.ok ? rot.data : null)!;
    expect(newKey).not.toBe(key);
    expect((oldRevokesAt.getTime() - Date.now()) / 86_400_000).toBeGreaterThan(6.9);
    expect((await authenticateApiKey(req(key), "cases:read")).ok).toBe(true); // antiga ainda vale
    expect((await authenticateApiKey(req(newKey), "cases:read")).ok).toBe(true);
    expect((await rotateApiKey(admin, id)).ok).toBe(false); // já rotacionada

    // antiga depois da carência: 401
    await db.update(apiKey).set({ revokedAt: new Date(Date.now() - 1000) }).where(eq(apiKey.id, id));
    expect((await authenticateApiKey(req(key), "cases:read")).ok).toBe(false);
    // nova expirada: 401 "expired"
    const newRow = await db.query.apiKey.findFirst({ where: eq(apiKey.keyHash, (await import("@/modules/api-keys/keys")).hashApiKey(newKey)) });
    await db.update(apiKey).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(apiKey.id, newRow!.id));
    const exp = await authenticateApiKey(req(newKey), "cases:read");
    expect(exp.ok).toBe(false);
    if (!exp.ok) expect((await exp.response.json()).error.code).toBe("expired");
  });
});

describe("snapshot diário", () => {
  it("grava por projeto e serve de referência para o Δ", async () => {
    const [company] = await db.insert(crmCompany).values({ name: "Snap Co", slug: `snap-${Date.now()}`, ownerId: admin.user.id }).returning({ id: crmCompany.id });
    const [opp] = await db.insert(crmOpportunity).values({ companyId: company.id, title: "Op Snap", stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
    const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId: company.id, title: "Projeto Snap", status: "active", ownerId: admin.user.id }).returning({ id: project.id });
    await db.insert(projectDeliverable).values([
      { projectId: p.id, title: "a", ownerId: admin.user.id, status: "done", completedAt: new Date() },
      { projectId: p.id, title: "b", ownerId: admin.user.id, status: "todo", dueAt: "2020-01-01" },
    ]);
    expect(await writeDailySnapshot("2026-09-26")).toBeGreaterThanOrEqual(1);
    const snaps = await loadSnapshotsUpTo("2026-09-26");
    expect(snaps.get(p.id)).toMatchObject({ doneCount: 1, openCount: 1, overdueCount: 1, progressPct: 50 });
    expect((await loadSnapshotsUpTo("2026-09-25")).get(p.id)).toBeUndefined();
  });
});
