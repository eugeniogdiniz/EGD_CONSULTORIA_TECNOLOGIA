import { it, expect } from "vitest";
import { normalizeEmail } from "@/modules/auth/normalize-email";

it("aplica trim e minúsculas", () => {
  expect(normalizeEmail("  Joao@Empresa.COM ")).toBe("joao@empresa.com");
});
