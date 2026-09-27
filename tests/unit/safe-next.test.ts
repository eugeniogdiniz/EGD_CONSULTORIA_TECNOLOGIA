import { it, expect } from "vitest";
import { safeNextPath } from "@/modules/auth/safe-next";

it("aceita caminhos internos com query", () => {
  expect(safeNextPath("/admin")).toBe("/admin");
  expect(safeNextPath("/portal/conta?x=1")).toBe("/portal/conta?x=1");
});

it("rejeita redirecionamentos externos e truques de parser", () => {
  expect(safeNextPath("//evil.com")).toBeNull();
  expect(safeNextPath("/\\evil.com")).toBeNull();
  expect(safeNextPath("http://evil.com")).toBeNull();
  expect(safeNextPath("https://evil.com/x")).toBeNull();
  expect(safeNextPath("/admin\\..\\x")).toBeNull();
  expect(safeNextPath("javascript:alert(1)")).toBeNull();
  expect(safeNextPath("")).toBeNull();
  expect(safeNextPath(null)).toBeNull();
});
