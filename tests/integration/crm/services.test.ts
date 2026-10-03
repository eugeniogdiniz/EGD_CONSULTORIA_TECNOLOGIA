import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmCompany, crmOpportunity } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { createService, setServiceActive, updateService } from "@/modules/crm/actions";
import { listServices, loadForecastInput } from "@/modules/crm/queries";
import { buildForecast } from "@/modules/crm/forecast";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
beforeAll(async () => {
  admin = await ensureTestAdmin();
});

describe("catálogo de serviços", () => {
  it("cria, edita, desativa e lista em ordem; recusa preço inválido", async () => {
    const a = await createService(admin, { name: "Sustentação mensal", description: "", unit: "mês", defaultPriceCents: "350000", position: "2" });
    const b = await createService(admin, { name: "Diagnóstico", description: "Levantamento inicial", unit: "projeto", defaultPriceCents: "800000", position: "1" });
    expect(a.ok && b.ok).toBe(true);
    expect((await createService(admin, { name: "x", unit: "h", defaultPriceCents: "-1" })).ok).toBe(false);
    let list = await listServices(admin);
    expect(list.map((s) => s.name)).toEqual(["Diagnóstico", "Sustentação mensal"]);
    const aId = (a.ok && a.data.id) as string;
    expect((await updateService(admin, aId, { name: "Sustentação", unit: "mês", defaultPriceCents: "400000", position: "0" })).ok).toBe(true);
    expect((await setServiceActive(admin, aId, false)).ok).toBe(true);
    list = await listServices(admin);
    expect(list.find((s) => s.id === aId)).toMatchObject({ name: "Sustentação", defaultPriceCents: 400_000, active: false });
    expect((await listServices(admin, { activeOnly: true })).some((s) => s.id === aId)).toBe(false);
    const acts = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, aId))).map((r) => r.a);
    expect(acts).toEqual(expect.arrayContaining(["crm.service.created", "crm.service.updated", "crm.service.archived"]));
  });
});

describe("previsão", () => {
  it("carrega as oportunidades com empresa e pondera por estágio", async () => {
    const [c] = await db.insert(crmCompany).values({ name: "Prev Co", slug: `prev-${Date.now()}`, ownerId: admin.user.id }).returning({ id: crmCompany.id });
    await db.insert(crmOpportunity).values([
      { companyId: c.id, title: "A", stage: "proposal", valueCents: 100_000, expectedCloseAt: "2030-01-15", ownerId: admin.user.id },
      { companyId: c.id, title: "B", stage: "lost", valueCents: 50_000, ownerId: admin.user.id, lostAt: new Date(), lostReason: "Preço" },
    ]);
    const input = await loadForecastInput(admin);
    expect(input.find((o) => o.title === "A")?.companyName).toBe("Prev Co");
    const f = buildForecast(input, "2029-12-01");
    expect(f.byStage.find((s) => s.stage === "proposal")!.weightedCents).toBeGreaterThanOrEqual(70_000);
    expect(f.lostReasons.some((r) => r.reason === "preço")).toBe(true);
  });
});
