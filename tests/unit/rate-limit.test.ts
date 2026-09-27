import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("permite até max dentro da janela e bloqueia o seguinte", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 2 });
    expect(rl.hit("a", 0).allowed).toBe(true);
    expect(rl.hit("a", 10).allowed).toBe(true);
    expect(rl.hit("a", 20)).toEqual({ allowed: false, remaining: 0 });
  });

  it("libera após a janela expirar", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    rl.hit("a", 0);
    expect(rl.hit("a", 1001).allowed).toBe(true);
  });

  it("chaves independentes não se afetam", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    rl.hit("a", 0);
    expect(rl.hit("b", 0).allowed).toBe(true);
  });

  it("informa quantas tentativas restam", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 3 });
    expect(rl.hit("a", 0).remaining).toBe(2);
    expect(rl.hit("a", 1).remaining).toBe(1);
    expect(rl.hit("a", 2).remaining).toBe(0);
  });

  it("reset zera o contador da chave", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    rl.hit("a", 0);
    expect(rl.hit("a", 1).allowed).toBe(false);
    rl.reset("a");
    expect(rl.hit("a", 2).allowed).toBe(true);
  });
});
