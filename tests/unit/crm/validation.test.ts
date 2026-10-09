import { describe, it, expect } from "vitest";
import {
  changeProposalStatusSchema,
  changeStageSchema,
  companySchema,
  contactSchema,
  interactionSchema,
  opportunitySchema,
  proposalSchema,
} from "@/modules/crm/validation";

const uuid = "11111111-1111-4111-8111-111111111111";
const uuid2 = "22222222-2222-4222-8222-222222222222";

describe("companySchema", () => {
  it("aceita empresa mínima", () => {
    const out = companySchema.parse({ name: "Acme" });
    expect(out.name).toBe("Acme");
    expect(out.cnpj).toBeNull();
    expect(out.source).toBe("outbound");
  });
  it("normaliza CNPJ com pontuação para 14 dígitos e rejeita quando o número não bate", () => {
    const out = companySchema.parse({ name: "Acme", cnpj: "12.345.678/0001-95" });
    expect(out.cnpj).toBe("12345678000195");
    const r = companySchema.safeParse({ name: "Acme", cnpj: "1234567" });
    expect(r.success).toBe(false);
  });
  it("aceita site sem protocolo", () => {
    expect(companySchema.parse({ name: "Acme", website: "acme.com" }).website).toBe("acme.com");
  });
  it("rejeita nome curto", () => {
    expect(companySchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("aceita contato mínimo com role default primary", () => {
    const out = contactSchema.parse({ companyId: uuid, name: "Marcos" });
    expect(out.role).toBe("primary");
    expect(out.email).toBeNull();
  });
  it("normaliza e-mail e recusa e-mail malformado", () => {
    const out = contactSchema.parse({ companyId: uuid, name: "Marcos", email: " MARCOS@X.COM " });
    expect(out.email).toBe("marcos@x.com");
    const r = contactSchema.safeParse({ companyId: uuid, name: "Marcos", email: "nope" });
    expect(r.success).toBe(false);
  });
});

describe("opportunitySchema", () => {
  it("aceita oportunidade mínima sem valor", () => {
    const out = opportunitySchema.parse({ companyId: uuid, title: "Piloto" });
    expect(out.valueCents).toBeNull();
    expect(out.stage).toBe("new");
    expect(out.currency).toBe("BRL");
  });
  it("rejeita valor negativo", () => {
    const r = opportunitySchema.safeParse({ companyId: uuid, title: "Piloto", valueCents: -1 });
    expect(r.success).toBe(false);
  });
  it("valida formato de data ISO em expectedCloseAt", () => {
    expect(opportunitySchema.safeParse({ companyId: uuid, title: "Piloto", expectedCloseAt: "2026-10-15" }).success).toBe(true);
    expect(opportunitySchema.safeParse({ companyId: uuid, title: "Piloto", expectedCloseAt: "15/10/2026" }).success).toBe(false);
  });
});

describe("changeStageSchema", () => {
  it("aceita ganho sem motivo", () => {
    expect(changeStageSchema.safeParse({ to: "won" }).success).toBe(true);
  });
  it("recusa perda sem lostReason", () => {
    const r = changeStageSchema.safeParse({ to: "lost" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("lostReason");
    }
  });
  it("aceita perda com motivo curto de pelo menos 3 caracteres", () => {
    expect(changeStageSchema.safeParse({ to: "lost", lostReason: "sem orçamento" }).success).toBe(true);
    expect(changeStageSchema.safeParse({ to: "lost", lostReason: "no" }).success).toBe(false);
  });
});

describe("interactionSchema", () => {
  const base = { type: "note" as const, at: "2026-09-27T14:00:00Z", summary: "Nota rápida" };
  it("aceita interação ancorada em empresa", () => {
    expect(interactionSchema.safeParse({ ...base, companyId: uuid }).success).toBe(true);
  });
  it("aceita interação ancorada em oportunidade", () => {
    expect(interactionSchema.safeParse({ ...base, opportunityId: uuid }).success).toBe(true);
  });
  it("aceita interação ancorada em contato", () => {
    expect(interactionSchema.safeParse({ ...base, contactId: uuid2 }).success).toBe(true);
  });
  it("recusa interação sem âncora nenhuma", () => {
    const r = interactionSchema.safeParse(base);
    expect(r.success).toBe(false);
  });
});

describe("proposalSchema", () => {
  it("aceita proposta mínima com valor positivo", () => {
    const out = proposalSchema.parse({ opportunityId: uuid, title: "v1", valueCents: 5500000 });
    expect(out.valueCents).toBe(5500000);
    expect(out.currency).toBe("BRL");
  });
  it("recusa valor zero ou negativo", () => {
    expect(proposalSchema.safeParse({ opportunityId: uuid, title: "v1", valueCents: 0 }).success).toBe(false);
    expect(proposalSchema.safeParse({ opportunityId: uuid, title: "v1", valueCents: -1 }).success).toBe(false);
  });
});

describe("changeProposalStatusSchema", () => {
  it("aceita transição para sent com data", () => {
    expect(changeProposalStatusSchema.safeParse({ to: "sent", sentAt: "2026-09-27", validUntil: "2026-10-27" }).success).toBe(true);
  });
  it("aceita transição para accepted com decisionNotes", () => {
    expect(changeProposalStatusSchema.safeParse({ to: "accepted", decisionNotes: "aprovado por Marcos" }).success).toBe(true);
  });
  it("recusa data em formato brasileiro", () => {
    expect(changeProposalStatusSchema.safeParse({ to: "sent", sentAt: "27/09/2026" }).success).toBe(false);
  });
});

describe("campos de uma linha normalizam espaço em branco", () => {
  it("título da proposta colado com tabulação vira texto com espaços simples", () => {
    const r = proposalSchema.safeParse({ opportunityId: "6f1c0b3a-2a7e-4c2b-9d0e-1a2b3c4d5e6f", title: "Implantação\tdo\tERP   Omie\n e Automação", valueCents: 100 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("Implantação do ERP Omie e Automação");
  });
  it("nome da empresa idem; mínimo continua valendo depois da limpeza", () => {
    expect(companySchema.parse({ name: "Acme\tLtda" }).name).toBe("Acme Ltda");
    expect(companySchema.safeParse({ name: "A\t" }).success).toBe(false);
  });
});
