import { it, expect } from "vitest";
import { resolveActiveOrganization, type OrgSummary } from "@/modules/auth/resolve-organization";

const a: OrgSummary = { id: "a", name: "A", slug: "a", status: "active" };
const b: OrgSummary = { id: "b", name: "B", slug: "b", status: "active" };
const off: OrgSummary = { id: "c", name: "C", slug: "c", status: "inactive" };

it("usa o cookie quando aponta para organização ativa do usuário", () => {
  expect(resolveActiveOrganization([a, b], "b")).toEqual(b);
});

it("cai para a primeira ativa quando o cookie é inválido ou de organização removida", () => {
  expect(resolveActiveOrganization([a, b], "zzz")).toEqual(a);
  expect(resolveActiveOrganization([a, b], undefined)).toEqual(a);
});

it("ignora organizações inativas mesmo apontadas pelo cookie", () => {
  expect(resolveActiveOrganization([off, b], "c")).toEqual(b);
});

it("retorna null sem organizações ativas", () => {
  expect(resolveActiveOrganization([off], undefined)).toBeNull();
  expect(resolveActiveOrganization([], "a")).toBeNull();
});
