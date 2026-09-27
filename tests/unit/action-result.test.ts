import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ok, fail, fromZod } from "@/lib/action-result";

describe("ActionResult", () => {
  it("ok e fail têm o formato esperado", () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(fail("x")).toEqual({ ok: false, error: "x" });
    expect(fail("x", { campo: ["erro"] })).toEqual({ ok: false, error: "x", fieldErrors: { campo: ["erro"] } });
  });

  it("fromZod agrupa erros por campo", () => {
    const r = z.object({ email: z.email(), nome: z.string().min(2) }).safeParse({ email: "nope", nome: "a" });
    if (r.success) throw new Error("esperava falha");
    const out = fromZod(r.error);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.fieldErrors?.email?.length).toBe(1);
      expect(out.fieldErrors?.nome?.length).toBe(1);
    }
  });
});
