import { describe, it, expect } from "vitest";
import { loginErrorMessage } from "@/modules/auth/login-error";

describe("loginErrorMessage", () => {
  it("senha errada e usuário inativo (401) dizem a mesma coisa", () => {
    expect(loginErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("E-mail ou senha incorretos.");
  });

  it("limite de tentativas mostra a mensagem do servidor", () => {
    expect(loginErrorMessage({ status: 429, message: "Muitas tentativas. Aguarde 15 minutos." }))
      .toBe("Muitas tentativas. Aguarde 15 minutos.");
    expect(loginErrorMessage({ status: 429 })).toBe("Muitas tentativas. Aguarde 15 minutos.");
  });

  it("origem recusada não se passa por senha errada", () => {
    const msg = loginErrorMessage({ status: 403, code: "INVALID_ORIGIN" });
    expect(msg).not.toContain("senha");
    expect(msg).toContain("endereço");
  });

  it("outro erro diz o código", () => {
    expect(loginErrorMessage({ status: 500 })).toContain("HTTP 500");
    expect(loginErrorMessage({ status: 400, code: "PASSWORD_TOO_LONG" })).toContain("PASSWORD_TOO_LONG");
  });
});
