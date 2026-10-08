import { describe, it, expect } from "vitest";
import {
  changeDeliverableStatusSchema,
  changeProjectStatusSchema,
  commentSchema,
  createProjectFromOpportunitySchema,
  deliverableSchema,
  dependencySchema,
  expenseSchema,
  manualTimeSchema,
  milestoneSchema,
  phaseSchema,
  projectSchema,
  reorderDeliverableSchema,
  startTimerSchema,
  templateSchema,
  updateAccountRateSchema,
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

// ── Fase 3.5 (extras) ───────────────────────────────────────────────────────

const uuid2 = "22222222-2222-4222-8222-222222222222";

describe("dependencySchema", () => {
  it("rejeita predecessor == successor", () => {
    const r = dependencySchema.safeParse({ predecessorId: uuid, successorId: uuid });
    expect(r.success).toBe(false);
  });
  it("aceita par distinto", () => {
    expect(dependencySchema.safeParse({ predecessorId: uuid, successorId: uuid2 }).success).toBe(true);
  });
});

describe("commentSchema", () => {
  it("aceita raiz (sem parent)", () => {
    const out = commentSchema.parse({ deliverableId: uuid, body: "olá" });
    expect(out.parentId).toBeNull();
  });
  it("aceita resposta (com parent)", () => {
    const out = commentSchema.parse({ deliverableId: uuid, parentId: uuid2, body: "resposta" });
    expect(out.parentId).toBe(uuid2);
  });
  it("body vazio recusado", () => {
    expect(commentSchema.safeParse({ deliverableId: uuid, body: "   " }).success).toBe(false);
  });
});

describe("startTimerSchema", () => {
  it("aceita apenas deliverableId", () => {
    expect(startTimerSchema.parse({ deliverableId: uuid }).notes).toBeNull();
  });
});

describe("manualTimeSchema", () => {
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const later = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  it("aceita janela passada com end > start", () => {
    const r = manualTimeSchema.safeParse({
      deliverableId: uuid,
      startedAt: past,
      endedAt: later,
    });
    expect(r.success).toBe(true);
  });

  it("recusa end <= start", () => {
    const r = manualTimeSchema.safeParse({
      deliverableId: uuid,
      startedAt: later,
      endedAt: past,
    });
    expect(r.success).toBe(false);
  });

  it("recusa end no futuro", () => {
    const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const r = manualTimeSchema.safeParse({
      deliverableId: uuid,
      startedAt: past,
      endedAt: futureEnd,
    });
    expect(r.success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("aceita despesa mínima (vencimento obrigatório; competência e projeto opcionais)", () => {
    const r = expenseSchema.safeParse({
      projectId: uuid,
      description: "Viagem",
      amountCents: 5000,
      dueAt: "2026-10-01",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.kind).toBe("other");
      expect(r.data.dateAt).toBeNull();
      expect(r.data.supplier).toBeNull();
    }
  });
  it("conta geral: projeto vazio vira null; sem vencimento recusa", () => {
    const geral = expenseSchema.safeParse({ projectId: "", description: "Imposto DAS", amountCents: 12000, kind: "tax", dueAt: "2026-10-20", supplier: "Receita Federal" });
    expect(geral.success).toBe(true);
    if (geral.success) expect(geral.data.projectId).toBeNull();
    const semVenc = expenseSchema.safeParse({ projectId: uuid, description: "Viagem", amountCents: 5000, dateAt: "2026-10-01" });
    expect(semVenc.success).toBe(false);
  });
  it("recusa amount negativo", () => {
    expect(
      expenseSchema.safeParse({
        projectId: uuid,
        description: "X",
        amountCents: -1,
        dateAt: "2026-10-01",
      }).success,
    ).toBe(false);
  });
  it("recusa data em formato errado", () => {
    expect(
      expenseSchema.safeParse({
        projectId: uuid,
        description: "Y",
        amountCents: 100,
        dateAt: "10/2026/01",
      }).success,
    ).toBe(false);
  });
  it("recusa kind desconhecido", () => {
    expect(
      expenseSchema.safeParse({
        projectId: uuid,
        description: "Y",
        amountCents: 100,
        dateAt: "2026-10-01",
        kind: "bribe",
      }).success,
    ).toBe(false);
  });
});

describe("templateSchema", () => {
  it("nome mínimo 2", () => {
    expect(templateSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(templateSchema.safeParse({ name: "OK" }).success).toBe(true);
  });
});

describe("createProjectFromOpportunitySchema com templateId", () => {
  it("templateId opcional; ausente vira null", () => {
    const out = createProjectFromOpportunitySchema.parse({ title: "Piloto" });
    expect(out.templateId).toBeNull();
  });
  it("templateId inválido é recusado", () => {
    expect(
      createProjectFromOpportunitySchema.safeParse({ title: "Piloto", templateId: "abc" }).success,
    ).toBe(false);
  });
});

describe("reorderDeliverableSchema", () => {
  it("aceita drop simples", () => {
    const out = reorderDeliverableSchema.parse({
      deliverableId: uuid,
      toStatus: "doing",
      toPosition: 2,
    });
    expect(out.toPosition).toBe(2);
  });
  it("drop em blocked sem motivo passa (motivo cobrado na action)", () => {
    // A validação de motivo continua em changeDeliverableStatusSchema;
    // reorder existe pra pura ordenação. Aqui garante que o schema aceita.
    expect(
      reorderDeliverableSchema.safeParse({
        deliverableId: uuid,
        toStatus: "blocked",
        toPosition: 0,
      }).success,
    ).toBe(true);
  });
});

describe("updateAccountRateSchema", () => {
  it("string vazia vira null", () => {
    expect(updateAccountRateSchema.parse({ hourlyRateCents: "" }).hourlyRateCents).toBeNull();
  });
  it("número aceito", () => {
    expect(updateAccountRateSchema.parse({ hourlyRateCents: 12000 }).hourlyRateCents).toBe(12000);
  });
  it("negativo recusado", () => {
    expect(updateAccountRateSchema.safeParse({ hourlyRateCents: -1 }).success).toBe(false);
  });
});
