import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { crmCompany, crmContact, crmOpportunity } from "@/db/schema";
import {
  listCompanies,
  listOpportunities,
  listOpportunitiesGroupedByStage,
  searchCrm,
  suggestCompanyByEmailDomain,
} from "@/modules/crm/queries";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const ownerId = ctx.user.id;

  const [urbhis] = await db
    .insert(crmCompany)
    .values({ name: "Consórcio URBHIS", slug: "consorcio-urbhis", website: "https://urbhis.com.br", cnpj: "12345678000195", ownerId })
    .returning({ id: crmCompany.id });
  const [santos] = await db
    .insert(crmCompany)
    .values({ name: "COHAB Santos", slug: "cohab-santos", website: "cohabsantos.gov.br", ownerId })
    .returning({ id: crmCompany.id });
  const [sanasa] = await db
    .insert(crmCompany)
    .values({ name: "SANASA", slug: "sanasa", ownerId, archivedAt: new Date() })
    .returning({ id: crmCompany.id });

  await db.insert(crmContact).values([
    { companyId: urbhis.id, name: "Marcos Ferreira", email: "marcos.ferreira@urbhis.com.br", role: "primary", ownerId },
    { companyId: urbhis.id, name: "Ana Beatriz", email: "ana@urbhis.com.br", role: "financial", ownerId },
    { companyId: santos.id, name: "Carla Souza", email: "carla@cohabsantos.gov.br", role: "primary", ownerId },
  ]);

  await db.insert(crmOpportunity).values([
    { companyId: urbhis.id, title: "Laudo TI", stage: "meeting", valueCents: 5500000, ownerId },
    { companyId: urbhis.id, title: "Migração Postgres", stage: "new", valueCents: 4200000, ownerId },
    { companyId: santos.id, title: "Diagnóstico", stage: "qualified", valueCents: 3800000, ownerId },
    { companyId: santos.id, title: "Piloto encerrado", stage: "won", valueCents: 1200000, wonAt: new Date(), ownerId },
    { companyId: santos.id, title: "Portal do beneficiário", stage: "lost", valueCents: 9600000, lostAt: new Date(), lostReason: "fora de orçamento", ownerId },
    { companyId: sanasa.id, title: "Integração de dados", stage: "proposal", valueCents: 7800000, ownerId },
  ]);
});

describe("listCompanies", () => {
  it("esconde arquivadas por default e mostra quando includeArchived=true", async () => {
    const ativas = await listCompanies(ctx);
    expect(ativas.map((c) => c.name).sort()).toEqual(["COHAB Santos", "Consórcio URBHIS"]);
    const todas = await listCompanies(ctx, { includeArchived: true });
    expect(todas.map((c) => c.name).sort()).toEqual(["COHAB Santos", "Consórcio URBHIS", "SANASA"]);
  });
  it("filtra por busca (case-insensitive, contém)", async () => {
    const r = await listCompanies(ctx, { search: "urbhis" });
    expect(r.map((c) => c.name)).toEqual(["Consórcio URBHIS"]);
  });
  it("busca por trecho de CNPJ", async () => {
    const r = await listCompanies(ctx, { search: "678000" });
    expect(r.map((c) => c.name)).toEqual(["Consórcio URBHIS"]);
  });
});

describe("listOpportunities", () => {
  it("por default esconde won/lost", async () => {
    const abertas = await listOpportunities(ctx);
    expect(abertas.every((o) => ["new", "qualified", "meeting", "proposal"].includes(o.stage))).toBe(true);
    expect(abertas).toHaveLength(4);
  });
  it("includeClosed=true traz ganhas e perdidas", async () => {
    const todas = await listOpportunities(ctx, { includeClosed: true });
    expect(todas).toHaveLength(6);
  });
  it("filtra por stage", async () => {
    const meet = await listOpportunities(ctx, { stage: "meeting" });
    expect(meet.map((o) => o.title)).toEqual(["Laudo TI"]);
  });
  it("busca por título ou nome da empresa", async () => {
    const r = await listOpportunities(ctx, { search: "URBHIS" });
    expect(r.map((o) => o.title).sort()).toEqual(["Laudo TI", "Migração Postgres"]);
  });
});

describe("listOpportunitiesGroupedByStage", () => {
  it("agrupa nas 6 colunas com contadores e somas", async () => {
    const cols = await listOpportunitiesGroupedByStage(ctx);
    expect(cols.map((c) => c.stage)).toEqual(["new", "qualified", "meeting", "proposal", "won", "lost"]);
    const byStage = Object.fromEntries(cols.map((c) => [c.stage, c]));
    expect(byStage.new.count).toBe(1);
    expect(byStage.qualified.count).toBe(1);
    expect(byStage.meeting.count).toBe(1);
    expect(byStage.proposal.count).toBe(1);
    expect(byStage.won.count).toBe(1);
    expect(byStage.lost.count).toBe(1);
    expect(byStage.proposal.totalValueCents).toBe(7800000);
    expect(byStage.won.totalValueCents).toBe(1200000);
  });
  it("propaga o selo de empresa arquivada nos cards", async () => {
    const cols = await listOpportunitiesGroupedByStage(ctx);
    const proposal = cols.find((c) => c.stage === "proposal")!;
    expect(proposal.opportunities[0].companyArchivedAt).not.toBeNull();
  });
});

describe("suggestCompanyByEmailDomain", () => {
  it("bate pelo website da empresa", async () => {
    const s = await suggestCompanyByEmailDomain(ctx, "novo@urbhis.com.br");
    expect(s?.name).toBe("Consórcio URBHIS");
  });
  it("bate pelo e-mail de um contato existente", async () => {
    const s = await suggestCompanyByEmailDomain(ctx, "outra@cohabsantos.gov.br");
    expect(s?.name).toBe("COHAB Santos");
  });
  it("domínio público retorna null", async () => {
    expect(await suggestCompanyByEmailDomain(ctx, "joao@gmail.com")).toBeNull();
    expect(await suggestCompanyByEmailDomain(ctx, "ana@outlook.com")).toBeNull();
  });
  it("e-mail vazio, null ou inválido retorna null", async () => {
    expect(await suggestCompanyByEmailDomain(ctx, "")).toBeNull();
    expect(await suggestCompanyByEmailDomain(ctx, null)).toBeNull();
    expect(await suggestCompanyByEmailDomain(ctx, "nao-tem-arroba")).toBeNull();
  });
  it("domínio sem cadastro nenhum retorna null", async () => {
    expect(await suggestCompanyByEmailDomain(ctx, "x@dominio-que-nao-existe.com")).toBeNull();
  });
});

describe("searchCrm", () => {
  it("query curta devolve vazio", async () => {
    expect(await searchCrm(ctx, "u")).toEqual([]);
  });
  it("encontra empresa, contato e oportunidade em uma única busca", async () => {
    const r = await searchCrm(ctx, "Marcos");
    expect(r.some((x) => x.kind === "contact" && x.label === "Marcos Ferreira")).toBe(true);
  });
  it("encontra por nome de empresa", async () => {
    const r = await searchCrm(ctx, "URBHIS");
    expect(r.some((x) => x.kind === "company")).toBe(true);
  });
});
