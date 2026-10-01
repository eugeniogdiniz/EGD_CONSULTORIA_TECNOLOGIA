import { describe, it, expect } from "vitest";
import {
  formatExternalParticipants,
  parseExternalParticipants,
  parseLocalDateTime,
  toLocalDateTimeInput,
} from "@/modules/meetings/rules";
import { actionItemSchema, meetingSchema } from "@/modules/meetings/validation";

describe("participantes externos", () => {
  it("aceita travessão, hífen, parênteses ou só o nome", () => {
    expect(parseExternalParticipants("Ana Souza — Consórcio URBHIS\nCarlos Lima - Prefeitura\nBia (Obras SA)\nDaniel")).toEqual([
      { name: "Ana Souza", organization: "Consórcio URBHIS" },
      { name: "Carlos Lima", organization: "Prefeitura" },
      { name: "Bia", organization: "Obras SA" },
      { name: "Daniel", organization: null },
    ]);
  });

  it("não quebra nome composto com hífen sem espaços", () => {
    expect(parseExternalParticipants("Jean-Pierre Silva")).toEqual([{ name: "Jean-Pierre Silva", organization: null }]);
  });

  it("ignora linhas vazias e repetidas (sem diferenciar maiúsculas)", () => {
    expect(parseExternalParticipants("\n  Ana — X \r\nana — x\n\n")).toEqual([{ name: "Ana", organization: "X" }]);
  });

  it("volta ao texto da caixa", () => {
    const list = [{ name: "Ana", organization: "X" }, { name: "Bia", organization: null }];
    expect(formatExternalParticipants(list)).toBe("Ana — X\nBia");
    expect(parseExternalParticipants(formatExternalParticipants(list))).toEqual(list);
  });
});

describe("data/hora local (Brasília)", () => {
  it("interpreta o datetime-local como horário de Brasília", () => {
    expect(parseLocalDateTime("2026-10-01T14:30")?.toISOString()).toBe("2026-10-01T17:30:00.000Z");
  });

  it("recusa formatos inválidos", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("01/10/2026 14:30")).toBeNull();
    expect(parseLocalDateTime("2026-13-01T14:30")).toBeNull();
    expect(parseLocalDateTime("2026-02-30T14:30")).toBeNull();
  });

  it("ida e volta", () => {
    expect(toLocalDateTimeInput(new Date("2026-10-01T17:30:00.000Z"))).toBe("2026-10-01T14:30");
    expect(toLocalDateTimeInput(parseLocalDateTime("2026-12-31T23:15")!)).toBe("2026-12-31T23:15");
  });
});

describe("validação da ata", () => {
  const base = { title: "Kickoff", heldAt: "2026-10-01T14:30", projectId: "", companyId: "" };

  it("exige projeto ou empresa", () => {
    const r = meetingSchema.safeParse(base);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["projectId"]);
  });

  it("normaliza campos e participantes", () => {
    const r = meetingSchema.safeParse({ ...base, companyId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6e", agenda: "  ", externals: "Ana — X" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.agenda).toBeNull();
      expect(r.data.projectId).toBeNull();
      expect(r.data.teamIds).toEqual([]);
      expect(r.data.externals).toEqual([{ name: "Ana", organization: "X" }]);
      expect(r.data.heldAt.toISOString()).toBe("2026-10-01T17:30:00.000Z");
    }
  });

  it("data/hora inválida vira erro de campo", () => {
    const r = meetingSchema.safeParse({ ...base, companyId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6e", heldAt: "ontem" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["heldAt"]);
  });

  it("item de ação exige projeto e título; prioridade padrão média", () => {
    expect(actionItemSchema.safeParse({ meetingId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6e", projectId: "", title: "x" }).success).toBe(false);
    const r = actionItemSchema.safeParse({
      meetingId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6e",
      projectId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6f",
      title: "Enviar cronograma",
      dueAt: "",
    });
    expect(r.success && r.data.priority).toBe("medium");
    expect(r.success && r.data.dueAt).toBeNull();
  });

  it("item de ação recusa prazo que não existe no calendário", () => {
    const r = actionItemSchema.safeParse({
      meetingId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6e",
      projectId: "0b9d6c52-8a4c-4c7e-9f7e-1d2a3b4c5d6f",
      title: "Enviar cronograma",
      dueAt: "2026-02-30",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["dueAt"]);
  });
});
