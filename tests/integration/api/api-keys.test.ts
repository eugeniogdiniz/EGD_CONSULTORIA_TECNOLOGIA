import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKey, auditLog, leads, siteCase } from "@/db/schema";
import { createApiKey, revokeApiKey } from "@/modules/api-keys/actions";
import { listApiKeys } from "@/modules/api-keys/queries";
import { createCase } from "@/modules/cases/actions";
import { setCasePublished } from "@/modules/cases/actions";
import { GET as listCases } from "@/app/api/v1/cases/route";
import { GET as getCaseBySlug } from "@/app/api/v1/cases/[slug]/route";
import { POST as postLead } from "@/app/api/v1/leads/route";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let readKey: string;
let writeKey: string;
let readId: string;

const call = (key: string | null, init: RequestInit = {}) =>
  new Request("http://localhost/api/v1/x", {
    ...init,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

async function newKey(name: string, scopes: string[]) {
  const r = await createApiKey(ctx, { name: `zz-teste ${name}`, scopes });
  if (!r.ok) throw new Error("falhou");
  return r.data;
}

const cleanup = async () => {
  await db.delete(apiKey).where(like(apiKey.name, "zz-teste%"));
  await db.delete(siteCase).where(like(siteCase.slug, "zz-teste%"));
};

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  await cleanup();
  const r = await newKey("leitura", ["cases:read"]);
  readKey = r.key;
  readId = r.id;
  writeKey = (await newKey("escrita", ["leads:write"])).key;
});
afterAll(cleanup);

describe("chaves", () => {
  it("guarda só o hash: o segredo não existe no banco nem na listagem", async () => {
    const row = await db.query.apiKey.findFirst({ where: eq(apiKey.id, readId) });
    expect(row?.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(readKey);
    const listed = await listApiKeys(ctx);
    expect(JSON.stringify(listed)).not.toContain(readKey);
    expect(listed.some((k) => "keyHash" in k)).toBe(false);
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "api_key.created"));
    expect(JSON.stringify(audits)).not.toContain(readKey);
  });

  it("recusa nome curto, escopo desconhecido e lista vazia", async () => {
    expect((await createApiKey(ctx, { name: "x", scopes: ["cases:read"] })).ok).toBe(false);
    expect((await createApiKey(ctx, { name: "zz-teste ok", scopes: ["admin:*"] })).ok).toBe(false);
    expect((await createApiKey(ctx, { name: "zz-teste ok", scopes: [] })).ok).toBe(false);
  });
});

describe("autenticação", () => {
  it("401 sem chave, com chave inválida e com formato errado", async () => {
    expect((await listCases(call(null))).status).toBe(401);
    expect((await listCases(call("egd_" + "a".repeat(43)))).status).toBe(401);
    expect((await listCases(call("qualquer"))).status).toBe(401);
  });

  it("403 quando a chave não tem o escopo", async () => {
    const res = await listCases(call(writeKey));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
    expect((await postLead(call(readKey, { method: "POST", body: "{}" }))).status).toBe(403);
  });

  it("registra o último uso", async () => {
    await listCases(call(readKey));
    const row = await db.query.apiKey.findFirst({ where: eq(apiKey.id, readId) });
    expect(row?.lastUsedAt).not.toBeNull();
  });

  it("chave revogada passa a receber 401", async () => {
    const k = await newKey("revogada", ["cases:read"]);
    expect((await listCases(call(k.key))).status).toBe(200);
    expect((await revokeApiKey(ctx, k.id)).ok).toBe(true);
    expect((await listCases(call(k.key))).status).toBe(401);
    expect((await revokeApiKey(ctx, k.id)).ok).toBe(false);
  });

  it("429 depois de 120 requisições no minuto", async () => {
    const k = await newKey("limite", ["cases:read"]);
    let last = 200;
    for (let i = 0; i < 121; i++) last = (await getCaseBySlug(call(k.key), { params: Promise.resolve({ slug: "nada" }) })).status;
    expect(last).toBe(429);
  });
});

describe("limite de tentativas inválidas por IP", () => {
  const xff = (ip: string, key: string | null) => call(key, { headers: { "x-forwarded-for": ip } });

  it("30 tentativas com chave inválida passam (401); a 31ª recebe 429 com Retry-After", async () => {
    const bad = "egd_" + "b".repeat(43);
    for (let i = 0; i < 30; i++) expect((await listCases(xff("203.0.113.9", bad))).status).toBe(401);
    const blocked = await listCases(xff("203.0.113.9", bad));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("60");
  });

  it("o bloqueio vale só para aquele IP", async () => {
    expect((await listCases(xff("198.51.100.7", readKey))).status).toBe(200);
  });

  it("autenticação válida zera o contador do IP", async () => {
    const bad = "egd_" + "c".repeat(43);
    for (let i = 0; i < 20; i++) await listCases(xff("192.0.2.5", bad));
    expect((await listCases(xff("192.0.2.5", readKey))).status).toBe(200);
    for (let i = 0; i < 29; i++) expect((await listCases(xff("192.0.2.5", bad))).status).toBe(401);
  });
});

describe("GET /api/v1/cases", () => {
  it("devolve só publicados, no contrato da API", async () => {
    const a = await createCase(ctx, { name: "Zz Teste Pub", sector: "Setor", size: "small", systems: "1", automations: "1", savings: "10,00", capex: "", featured: false, published: true, deliverables: "X", statusNote: "" });
    const b = await createCase(ctx, { name: "Zz Teste Rasc", sector: "Setor", size: "small", systems: "0", automations: "0", savings: "", capex: "", featured: false, published: false, deliverables: "", statusNote: "" });
    if (!a.ok || !b.ok) throw new Error("falhou");

    const res = await listCases(call(readKey));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { slug: string; savingsCents: number; deliverables: string[] }[] };
    const slugs = body.data.map((c) => c.slug);
    expect(slugs).toContain("zz-teste-pub");
    expect(slugs).not.toContain("zz-teste-rasc");
    expect(body.data.find((c) => c.slug === "zz-teste-pub")).toMatchObject({ savingsCents: 1000, deliverables: ["X"] });

    const one = await getCaseBySlug(call(readKey), { params: Promise.resolve({ slug: "zz-teste-pub" }) });
    expect(one.status).toBe(200);
    expect((await getCaseBySlug(call(readKey), { params: Promise.resolve({ slug: "zz-teste-rasc" }) })).status).toBe(404);

    await setCasePublished(ctx, a.data.id, false);
    expect((await getCaseBySlug(call(readKey), { params: Promise.resolve({ slug: "zz-teste-pub" }) })).status).toBe(404);
  });
});

describe("POST /api/v1/leads", () => {
  const good = { name: "Maria Souza", email: "Maria@Empresa.com", company: "Empresa", message: "Quero conversar sobre um projeto." };

  it("cria o lead com origem api e responde 201", async () => {
    const res = await postLead(call(writeKey, { method: "POST", body: JSON.stringify(good) }));
    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { id: string } };
    const row = await db.query.leads.findFirst({ where: eq(leads.id, data.id) });
    expect(row).toMatchObject({ name: "Maria Souza", email: "maria@empresa.com", source: "api", status: "new" });
  });

  it("422 com erros por campo quando os dados são inválidos", async () => {
    const res = await postLead(call(writeKey, { method: "POST", body: JSON.stringify({ name: "M", email: "x", message: "curta" }) }));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error.code).toBe("validation_error");
    expect(Object.keys(error.fields)).toEqual(expect.arrayContaining(["name", "email", "message"]));
  });

  it("413 quando o corpo passa de 32 KB, com ou sem content-length", async () => {
    const big = JSON.stringify({ ...good, message: "x".repeat(40 * 1024) });
    expect((await postLead(call(writeKey, { method: "POST", body: big }))).status).toBe(413);
    const sem = new Request("http://localhost/api/v1/leads", { method: "POST", body: big, headers: { Authorization: `Bearer ${writeKey}` } });
    sem.headers.delete("content-length");
    expect((await postLead(sem)).status).toBe(413);
  });

  it("400 para JSON quebrado", async () => {
    expect((await postLead(call(writeKey, { method: "POST", body: "{nope" }))).status).toBe(400);
  });
});
