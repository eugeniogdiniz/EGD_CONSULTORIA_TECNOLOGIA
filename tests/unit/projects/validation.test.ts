import { describe, it, expect } from "vitest";
import {
  changeDeliverableStatusSchema,
  changeProjectStatusSchema,
  createProjectFromOpportunitySchema,
  deliverableSchema,
  milestoneSchema,
  phaseSchema,
  projectSchema,
} from "@/modules/projects/validation";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("projectSchema", () => {
  it("aceita projeto mínimo com título", () => {
    const out = projectSchema.parse({ title: "Piloto" });
    expect(out.currency).toBe("BRL");
    expect(out.budgetCents).toBeNull();
  });
  it("rejeita título curto", () => {
    expect(projectSchema.safeParse({ title: "A" }).success).toBe(false);
  });
  it("valor negativo é recusado", () => {
    expect(projectSchema.safeParse({ title: "OK", budgetCents: -1 }).success).toBe(false);
  });
});

describe("createProjectFromOpportunitySchema", () => {
  it("checkbox 'on' vira true", () => {
    expect(createProjectFromOpportunitySchema.parse({ title: "OK", copyValue: "on" }).copyValue).toBe(true);
  });
  it("checkbox ausente vira false", () => {
    expect(createProjectFromOpportunitySchema.parse({ title: "OK" }).copyValue).toBe(false);
  });
});

describe("phaseSchema e milestoneSchema", () => {
  it("phase exige nome", () => {
    expect(phaseSchema.safeParse({ projectId: uuid, name: "A" }).success).toBe(false);
    expect(phaseSchema.safeParse({ projectId: uuid, name: "Kickoff" }).success).toBe(true);
  });
  it("milestone exige dueAt no formato ISO", () => {
    expect(milestoneSchema.safeParse({ projectId: uuid, name: "Aceite", dueAt: "12/12/2026" }).success).toBe(false);
    expect(milestoneSchema.safeParse({ projectId: uuid, name: "Aceite", dueAt: "2026-12-12" }).success).toBe(true);
  });
});

describe("deliverableSchema", () => {
  it("aceita entrega mínima sem assignee, sem due", () => {
    expect(deliverableSchema.parse({ projectId: uuid, title: "Ata" }).assigneeId).toBeNull();
  });
});

describe("changeDeliverableStatusSchema", () => {
  it("blocked sem motivo falha com fieldError em blockReason", () => {
    const r = changeDeliverableStatusSchema.safeParse({ to: "blocked" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path.join("."))).toContain("blockReason");
    }
  });
  it("blocked com motivo curto (< 3 chars) falha", () => {
    expect(changeDeliverableStatusSchema.safeParse({ to: "blocked", blockReason: "no" }).success).toBe(false);
  });
  it("blocked com motivo válido passa", () => {
    expect(changeDeliverableStatusSchema.safeParse({ to: "blocked", blockReason: "espera aprovação" }).success).toBe(true);
  });
  it("done sem motivo passa", () => {
    expect(changeDeliverableStatusSchema.safeParse({ to: "done" }).success).toBe(true);
  });
});

describe("changeProjectStatusSchema", () => {
  it("aceita status válido", () => {
    expect(changeProjectStatusSchema.safeParse({ to: "delivered" }).success).toBe(true);
  });
  it("rejeita status desconhecido", () => {
    expect(changeProjectStatusSchema.safeParse({ to: "shipped" }).success).toBe(false);
  });
});
