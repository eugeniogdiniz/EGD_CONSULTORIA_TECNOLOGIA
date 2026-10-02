import { it, expect } from "vitest";
import { isUniqueViolation, pgErrorCode } from "@/lib/pg-errors";

it("lê o código do Postgres direto ou dentro de cause (DrizzleQueryError)", () => {
  expect(pgErrorCode({ code: "23505" })).toBe("23505");
  expect(pgErrorCode(new Error("Failed query", { cause: { code: "23505" } }))).toBe("23505");
  expect(isUniqueViolation(new Error("x", { cause: { code: "23505" } }))).toBe(true);
  expect(isUniqueViolation(new Error("x"))).toBe(false);
  expect(isUniqueViolation(null)).toBe(false);
});
