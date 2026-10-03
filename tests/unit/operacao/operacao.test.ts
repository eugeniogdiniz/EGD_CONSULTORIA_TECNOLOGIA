import { describe, it, expect } from "vitest";
import { describeError, fingerprint, stackAnchor } from "@/modules/errors/capture";
import { windowStart } from "@/lib/rate-limit";
import { planRestoreOrder } from "@/modules/backup/run";
import { searchGroupsFor } from "@/modules/search/queries";

describe("fingerprint de erro", () => {
  const mk = (msg: string, where = "at render (/app/src/app/(admin)/admin/page.tsx:10:5)") => {
    const e = new Error(msg);
    e.stack = `Error: ${msg}\n    at node_modules/x/y.js:1:1\n    ${where}`;
    return describeError(e);
  };
  it("é estável para o mesmo erro, ignora ids e números na mensagem, e muda com o lugar", () => {
    expect(fingerprint(mk("falhou 123 em 7c9e6679-7425-40de-944b-e07fc1f90ae7"))).toBe(fingerprint(mk("falhou 999 em 11111111-2222-4333-8444-555555555555")));
    expect(fingerprint(mk("falhou"))).not.toBe(fingerprint(mk("falhou", "at other (/app/src/modules/crm/actions.ts:5:5)")));
    expect(fingerprint(mk("a"))).not.toBe(fingerprint(mk("b")));
  });
  it("âncora do stack pula node_modules e remove linha:coluna", () => {
    expect(stackAnchor("Error: x\n    at node_modules/a.js:1:1\n    at fn (/app/src/x.ts:12:3)")).toBe("at fn (/app/src/x.ts");
    expect(stackAnchor(null)).toBe("");
    expect(describeError("texto").message).toBe("texto");
  });
});

describe("janela fixa do limitador", () => {
  it("alinha o início da janela e muda ao cruzar o limite", () => {
    const w = 60_000;
    expect(windowStart(60_000 * 10 + 5, w).getTime()).toBe(60_000 * 10);
    expect(windowStart(60_000 * 11 - 1, w).getTime()).toBe(60_000 * 10);
    expect(windowStart(60_000 * 11, w).getTime()).toBe(60_000 * 11);
  });
});

describe("ordem de restauração", () => {
  it("pais antes dos filhos; ciclos quebram sem travar", () => {
    const order = planRestoreOrder([
      { table: "project", dependsOn: ["crm_company", "users"] },
      { table: "users", dependsOn: [] },
      { table: "crm_company", dependsOn: ["users", "organizations"] },
      { table: "organizations", dependsOn: [] },
      { table: "a", dependsOn: ["b"] },
      { table: "b", dependsOn: ["a"] },
    ]);
    expect(order.indexOf("users")).toBeLessThan(order.indexOf("crm_company"));
    expect(order.indexOf("crm_company")).toBeLessThan(order.indexOf("project"));
    expect(order).toHaveLength(6);
    expect(new Set(order).size).toBe(6);
  });
});

describe("grupos da busca por papel", () => {
  it("colaborador não vê comercial nem organizações", () => {
    const col = searchGroupsFor("collaborator").map((g) => g.key);
    expect(col).toEqual(["projects", "deliverables", "requests", "meetings"]);
    expect(searchGroupsFor("admin")).toHaveLength(9);
  });
});
