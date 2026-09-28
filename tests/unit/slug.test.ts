import { it, expect } from "vitest";
import { slugify } from "@/modules/tenancy/slug";

it("slugifica com acentos e símbolos", () => {
  expect(slugify("Construtora São João & Cia.")).toBe("construtora-sao-joao-cia");
});

it("colapsa separadores repetidos e remove das pontas", () => {
  expect(slugify("  --ACME   Ltda--  ")).toBe("acme-ltda");
});
