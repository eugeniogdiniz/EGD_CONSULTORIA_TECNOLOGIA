import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://egd:egd@localhost:5432/egd",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  SMTP_HOST: "localhost", SMTP_PORT: "1025", SMTP_USER: "", SMTP_PASS: "",
  MAIL_FROM: "EGD <no-reply@egdsystem.com.br>",
  ADMIN_NOTIFY_EMAIL: "admin@egdsystem.com.br",
  S3_ENDPOINT: "http://localhost:9000", S3_BUCKET: "egd",
  S3_ACCESS_KEY: "minio", S3_SECRET_KEY: "minio12345",
};

describe("parseEnv", () => {
  it("aceita ambiente válido e converte porta para número", () => {
    const env = parseEnv(valid);
    expect(env.SMTP_PORT).toBe(1025);
  });
  it("rejeita segredo curto com mensagem que cita a chave", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "curto" })).toThrow(/BETTER_AUTH_SECRET/);
  });
  it("rejeita chave ausente", () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });
});
