import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, files, memberships, notification, organizations, portalRequest, portalRequestMessage } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { assignRequest, createRequest, replyAsClient, replyAsTeam, setRequestPriority } from "@/modules/requests/actions";
import { countBreachedSla, getRequestForAdmin, listAllRequests, listPortalRequestMessages, listPortalRequests, listRequestAttachments, listRequestMessagesForAdmin } from "@/modules/requests/queries";
import { sendReminders } from "@/modules/requests/reminders";
import { getDownloadUrl } from "@/modules/files/actions";
import { loadDailyDigestInput } from "@/modules/jobs/digests/daily";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let admin2: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;

async function user(email: string, name: string, role: "admin" | "client") {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role, active: true }, { method: "admin" });
  return { id: u.id, name, email, role, active: true as const };
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  admin2 = { kind: "admin", user: { ...(await user("extras-admin2@test.local", "Admin Dois", "admin")), role: "admin" } };
  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: "org-a" }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: "org-b" }).returning();
  const a = await user("extras-a@test.local", "Cliente A", "client");
  const b = await user("extras-b@test.local", "Cliente B", "client");
  await db.insert(memberships).values([{ userId: a.id, organizationId: orgA.id }, { userId: b.id, organizationId: orgB.id }]);
  ctxA = { kind: "portal", user: { ...a, role: "client" }, organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: { ...b, role: "client" }, organization: orgB, organizations: [orgB] };
});

const txt = (name: string, content = "conteudo") => new File([content], name, { type: "text/plain" });
const SP9 = new Date("2026-10-01T12:00:00Z"); // quinta, 09:00 em SP

async function open(ctx: PortalContext, files: File[] = [], now = new Date()) {
  const r = await createRequest(ctx, { title: "Acesso", body: "Preciso de acesso ao servidor de arquivos.", projectId: "" }, files, now);
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data.id;
}

describe("anexos", () => {
  it("cliente abre com dois anexos: arquivos na organização dele, listados no portal e no admin", async () => {
    const id = await open(ctxA, [txt("print.txt"), txt("planilha.csv", "a;b")]);
    const atts = await listRequestAttachments(ctxA, id);
    expect(atts.map((a) => a.name).sort()).toEqual(["planilha.csv", "print.txt"]);
    expect(atts.every((a) => a.messageId === null)).toBe(true);
    const stored = await db.select().from(files).where(eq(files.id, atts[0].fileId));
    expect(stored[0].organizationId).toBe(ctxA.organization.id);
    expect(stored[0].uploadedBy).toBe(ctxA.user.id);
    expect((await listRequestAttachments(admin, id)).length).toBe(2);
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "portal.request.attached")));
    expect(audits).toHaveLength(1);
    expect(audits[0].metadata.count).toBe(2);
  });

  it("cliente de outra organização não baixa o anexo; o dono baixa", async () => {
    const id = await open(ctxA, [txt("segredo.txt")]);
    const [att] = await listRequestAttachments(ctxA, id);
    expect((await getDownloadUrl(ctxB, att.fileId)).ok).toBe(false);
    expect((await getDownloadUrl(ctxA, att.fileId)).ok).toBe(true);
    expect(await listRequestAttachments(ctxB, id)).toEqual([]);
  });

  it("recusa tipo proibido e mais de 5 arquivos sem criar nada", async () => {
    const before = (await listPortalRequests(ctxA)).length;
    const r1 = await createRequest(ctxA, { title: "Virus", body: "Segue o programa em anexo.", projectId: "" }, [txt("x.exe")]);
    expect(r1.ok).toBe(false);
    expect(!r1.ok && r1.fieldErrors?.files?.[0]).toMatch(/não permitido/);
    const r2 = await createRequest(ctxA, { title: "Muitos", body: "Seguem os arquivos em anexo.", projectId: "" }, Array.from({ length: 6 }, (_, i) => txt(`a${i}.txt`)));
    expect(r2.ok).toBe(false);
    expect((await listPortalRequests(ctxA)).length).toBe(before);
  });

  it("resposta do cliente e da equipe levam anexos ligados à mensagem", async () => {
    const id = await open(ctxA);
    expect((await replyAsClient(ctxA, { requestId: id, body: "Segue o print." }, [txt("print2.txt")])).ok).toBe(true);
    expect((await replyAsTeam(admin, { requestId: id, body: "Segue o manual." }, [txt("manual.txt")])).ok).toBe(true);
    const msgs = await listPortalRequestMessages(ctxA, id);
    const atts = await listRequestAttachments(ctxA, id);
    expect(atts).toHaveLength(2);
    expect(atts.map((a) => a.messageId).sort()).toEqual(msgs.map((m) => m.id).sort());
  });
});

describe("nota interna", () => {
  it("só a equipe vê; não muda status, não conta como resposta nem entra na contagem do portal", async () => {
    const id = await open(ctxA);
    const r = await replyAsTeam(admin, { requestId: id, body: "Combinar com o financeiro antes de responder.", internal: true }, [txt("interno.txt")]);
    expect(r.ok).toBe(true);
    const req = await getRequestForAdmin(admin, id);
    expect(req?.status).toBe("open");
    expect(req?.firstResponseAt).toBeNull();
    expect(await listPortalRequestMessages(ctxA, id)).toEqual([]);
    expect((await listRequestAttachments(ctxA, id)).length).toBe(0);
    expect((await listRequestAttachments(admin, id)).length).toBe(1);
    const adminMsgs = await listRequestMessagesForAdmin(admin, id);
    expect(adminMsgs).toHaveLength(1);
    expect(adminMsgs[0].internal).toBe(true);
    expect((await listPortalRequests(ctxA)).find((x) => x.id === id)?.messages).toBe(0);
    expect(await db.select().from(notification).where(and(eq(notification.entityId, id), eq(notification.kind, "request.team_reply")))).toHaveLength(0);
    // o resumo diário continua vendo a solicitação como "aguardando a equipe"
    const digest = await loadDailyDigestInput("2026-10-02");
    expect(digest.requests.find((x) => x.id === id)?.lastAuthor).toBeNull();
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "request.note.created")));
    expect(audits).toHaveLength(1);
  });

  it("resposta pública grava a primeira resposta e move para em andamento", async () => {
    const id = await open(ctxA);
    await replyAsTeam(admin, { requestId: id, body: "Oi, vamos ver." });
    const req = await getRequestForAdmin(admin, id);
    expect(req?.status).toBe("in_progress");
    expect(req?.firstResponseAt).not.toBeNull();
  });
});

describe("SLA", () => {
  it("prazo de primeira resposta: média = 8 h úteis; prioridade recalcula só antes da resposta", async () => {
    const id = await open(ctxA, [], SP9);
    let req = await getRequestForAdmin(admin, id);
    expect(req?.firstResponseDueAt?.toISOString()).toBe(new Date("2026-10-01T20:00:00Z").toISOString()); // 17:00 SP
    await setRequestPriority(admin, id, "urgent");
    req = await getRequestForAdmin(admin, id);
    expect(req?.firstResponseDueAt?.toISOString()).toBe(new Date("2026-10-01T14:00:00Z").toISOString()); // 11:00 SP
    await replyAsTeam(admin, { requestId: id, body: "Respondido." });
    await setRequestPriority(admin, id, "low");
    req = await getRequestForAdmin(admin, id);
    expect(req?.firstResponseDueAt?.toISOString()).toBe(new Date("2026-10-01T14:00:00Z").toISOString());
  });

  it("filtro e contagem de SLA estourado; respondida sai; ordem põe estouradas primeiro", async () => {
    await db.delete(portalRequest);
    const old = await open(ctxA, [], SP9); // venceu 17:00 SP de 2026-10-01
    const fresh = await open(ctxA, [], new Date()); // ainda no prazo
    const answered = await open(ctxA, [], SP9);
    await replyAsTeam(admin, { requestId: answered, body: "ok" });
    const now = new Date("2026-10-05T15:00:00Z");
    expect(await countBreachedSla(now)).toBe(1);
    const breached = await listAllRequests(admin, { sla: "breached" }, now);
    expect(breached.map((r) => r.id)).toEqual([old]);
    const all = await listAllRequests(admin, {}, now);
    expect(all[0].id).toBe(old);
    expect(all.map((r) => r.id)).toContain(fresh);
  });
});

describe("responsável", () => {
  it("atribui, audita, notifica o atribuído (não quem se atribui) e filtra por responsável", async () => {
    await db.delete(notification);
    const id = await open(ctxA);
    expect((await assignRequest(admin, id, admin.user.id)).ok).toBe(true);
    expect(await db.select().from(notification).where(eq(notification.kind, "request.assigned"))).toHaveLength(0);
    expect((await assignRequest(admin, id, admin2.user.id)).ok).toBe(true);
    const notes = await db.select().from(notification).where(eq(notification.kind, "request.assigned"));
    expect(notes).toHaveLength(1);
    expect(notes[0].userId).toBe(admin2.user.id);
    expect((await getRequestForAdmin(admin, id))?.assigneeName).toBe("Admin Dois");
    expect((await listAllRequests(admin, { assigneeId: admin2.user.id })).map((r) => r.id)).toContain(id);
    expect((await listAllRequests(admin, { assigneeId: admin.user.id })).map((r) => r.id)).not.toContain(id);
    expect((await assignRequest(admin, id, ctxA.user.id)).ok).toBe(false);
    expect((await assignRequest(admin, id, null)).ok).toBe(true);
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "request.assigned")));
    expect(audits).toHaveLength(3);
  });
});

describe("lembrete ao cliente", () => {
  it("envia uma vez após 5 dias úteis sem retorno, incrementa e não repete no dia seguinte", async () => {
    await db.delete(portalRequest);
    await db.delete(notification);
    const id = await open(ctxA);
    await replyAsTeam(admin, { requestId: id, body: "Pode testar o acesso?" });
    // nota interna depois não conta como última mensagem
    await replyAsTeam(admin, { requestId: id, body: "lembrar de cobrar", internal: true });
    // envelhece a resposta da equipe: 2026-10-01 09:30 SP
    await db.update(portalRequestMessage).set({ createdAt: new Date("2026-10-01T12:30:00Z") }).where(and(eq(portalRequestMessage.requestId, id), eq(portalRequestMessage.internal, false)));

    const tooSoon = await sendReminders(new Date("2026-10-06T12:00:00Z")); // terça: 3 dias úteis
    expect(tooSoon.reminded).toBe(0);
    const first = await sendReminders(new Date("2026-10-08T13:00:00Z")); // quinta 10:00 SP: 5 dias úteis completos
    expect(first.reminded).toBe(1);
    expect(first.sent).toBe(1);
    let req = await getRequestForAdmin(admin, id);
    expect(req?.reminderCount).toBe(1);
    expect(req?.lastReminderAt).not.toBeNull();
    const notes = await db.select().from(notification).where(and(eq(notification.userId, ctxA.user.id), eq(notification.kind, "request.reminder")));
    expect(notes).toHaveLength(1);
    expect(notes[0].url).toBe(`/portal/solicitacoes/${id}`);

    expect((await sendReminders(new Date("2026-10-09T12:00:00Z"))).reminded).toBe(0); // dia seguinte: nada
    expect((await sendReminders(new Date("2026-10-15T14:00:00Z"))).reminded).toBe(1); // +5 dias úteis: segundo
    req = await getRequestForAdmin(admin, id);
    expect(req?.reminderCount).toBe(2);
    expect((await sendReminders(new Date("2026-10-22T12:00:00Z"))).reminded).toBe(0); // máximo atingido
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "request.reminded")));
    expect(audits).toHaveLength(2);
  });

  it("cliente que respondeu por último não é lembrado", async () => {
    await db.delete(portalRequest);
    const id = await open(ctxA);
    await replyAsTeam(admin, { requestId: id, body: "Pode testar?" });
    await replyAsClient(ctxA, { requestId: id, body: "Ainda não consegui." });
    await db.update(portalRequestMessage).set({ createdAt: new Date("2026-09-01T12:30:00Z") }).where(eq(portalRequestMessage.requestId, id));
    expect((await sendReminders(new Date("2026-10-08T12:00:00Z"))).reminded).toBe(0);
  });
});
