import { execFileSync } from "node:child_process";
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, twoFactors, users } from "@/db/schema";
import "../setup";

const EMAIL = "dois-fatores@test.local";
const PASSWORD = "senha-forte-de-teste-1";

/** Cookie de sessão a partir dos Set-Cookie de uma resposta do Better Auth. */
const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

/** O URI traz o segredo em base32 (como o app autenticador o lê); o gerador de códigos usa o segredo cru. */
const secretOf = (totpURI: string) =>
  new TextDecoder().decode(base32.decode(new URL(totpURI).searchParams.get("secret") as string));
const codeFor = (secret: string) => createOTP(secret).totp();

async function signIn() {
  return auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD }, asResponse: true });
}

beforeAll(async () => {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser(
    { email: EMAIL, name: "Dois Fatores", emailVerified: true, role: "client", active: true },
    { method: "admin" },
  );
  await c.internalAdapter.linkAccount({ userId: u.id, providerId: "credential", accountId: u.id, password: await c.password.hash(PASSWORD) });
});

const row = () => db.query.users.findFirst({ where: eq(users.email, EMAIL) });

describe("verificação em duas etapas", () => {
  let secret = "";
  let backup: string[] = [];

  it("login sem 2FA continua criando a sessão direto", async () => {
    const res = await signIn();
    expect(res.status).toBe(200);
    expect(cookieOf(res)).toContain("session_token");
    expect((await res.json()).twoFactorRedirect).toBeFalsy();
  });

  it("ativar exige a senha e devolve o URI TOTP e 10 códigos de recuperação; ainda não vale até confirmar", async () => {
    const cookie = cookieOf(await signIn());
    const wrong = await auth.api.enableTwoFactor({ body: { password: "errada-errada-1" }, headers: { cookie }, asResponse: true });
    expect(wrong.status).toBeGreaterThanOrEqual(400);

    const ok = await auth.api.enableTwoFactor({ body: { password: PASSWORD, method: "totp" }, headers: { cookie } });
    if (ok.method !== "totp") throw new Error("esperava TOTP");
    expect(ok.totpURI).toContain("otpauth://totp/");
    expect(ok.totpURI).toContain("EGD");
    expect(ok.backupCodes).toHaveLength(10);
    secret = secretOf(ok.totpURI);
    backup = ok.backupCodes;
    expect((await row())?.twoFactorEnabled).toBeFalsy(); // só liga depois de confirmar um código
  });

  it("confirmar com código errado falha; com o certo liga o 2FA", async () => {
    const cookie = cookieOf(await signIn());
    const bad = await auth.api.verifyTOTP({ body: { code: "000000" }, headers: { cookie }, asResponse: true });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    const good = await auth.api.verifyTOTP({ body: { code: await codeFor(secret) }, headers: { cookie }, asResponse: true });
    expect(good.status).toBe(200);
    expect((await row())?.twoFactorEnabled).toBe(true);
  });

  it("agora o login pede o segundo fator e NÃO cria sessão antes dele", async () => {
    const res = await signIn();
    const body = await res.json();
    expect(body.twoFactorRedirect).toBe(true);
    const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
    const session = cookies.find((c) => c.includes("session_token="));
    expect(session === undefined || session.endsWith("session_token=")).toBe(true); // vazio/limpo
    expect(cookies.some((c) => c.includes("two_factor"))).toBe(true); // cookie do desafio pendente
  });

  it("auditoria: a etapa da senha não conta como login; o segundo fator conta, com mfa=true", async () => {
    const u = (await row())!;
    const logins = async () => (await db.select().from(auditLog).where(eq(auditLog.actorId, u.id))).filter((a) => a.action === "auth.login");
    const before = (await logins()).length;
    const pending = cookieOf(await signIn());
    expect((await logins()).length).toBe(before); // só a senha: nada registrado
    await auth.api.verifyTOTP({ body: { code: await codeFor(secret) }, headers: { cookie: pending }, asResponse: true });
    const after = await logins();
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)?.metadata).toMatchObject({ mfa: true });
  });

  it("segundo fator com código TOTP correto conclui o login", async () => {
    const first = await signIn();
    const pending = cookieOf(first); // cookie do desafio pendente
    const res = await auth.api.verifyTOTP({ body: { code: await codeFor(secret) }, headers: { cookie: pending }, asResponse: true });
    expect(res.status).toBe(200);
    expect(cookieOf(res)).toContain("session_token");
  });

  it("código de recuperação funciona uma vez só", async () => {
    const code = backup[0];
    const a = await auth.api.verifyBackupCode({ body: { code }, headers: { cookie: cookieOf(await signIn()) }, asResponse: true });
    expect(a.status).toBe(200);
    const b = await auth.api.verifyBackupCode({ body: { code }, headers: { cookie: cookieOf(await signIn()) }, asResponse: true });
    expect(b.status).toBeGreaterThanOrEqual(400);
  });

  it("desativar exige a senha e remove o segredo", async () => {
    const pending = cookieOf(await signIn());
    const login = await auth.api.verifyTOTP({ body: { code: await codeFor(secret) }, headers: { cookie: pending }, asResponse: true });
    const cookie = cookieOf(login);
    const wrong = await auth.api.disableTwoFactor({ body: { password: "errada-errada-1" }, headers: { cookie }, asResponse: true });
    expect(wrong.status).toBeGreaterThanOrEqual(400);
    await auth.api.disableTwoFactor({ body: { password: PASSWORD }, headers: { cookie } });
    expect((await row())?.twoFactorEnabled).toBe(false);
    const u = await row();
    expect(await db.select().from(twoFactors).where(eq(twoFactors.userId, u!.id))).toHaveLength(0);
    expect((await (await signIn()).json()).twoFactorRedirect).toBeFalsy();
  });

  it("ativar e desativar ficam na auditoria", async () => {
    const u = (await row())!;
    const actions = (await db.select().from(auditLog).where(eq(auditLog.entityId, u.id))).map((a) => a.action);
    expect(actions).toContain("auth.2fa.enabled");
    expect(actions).toContain("auth.2fa.disabled");
  });
});

describe("recuperação: npm run auth:reset-2fa", () => {
  const RESET_EMAIL = "perdeu-aparelho@test.local";

  it("remove o 2FA, encerra as sessões, registra na auditoria e o login volta a ser só senha", async () => {
    const c = await auth.$context;
    const u = await c.internalAdapter.createUser({ email: RESET_EMAIL, name: "Perdeu", emailVerified: true, role: "client", active: true }, { method: "admin" });
    await c.internalAdapter.linkAccount({ userId: u.id, providerId: "credential", accountId: u.id, password: await c.password.hash(PASSWORD) });

    const login = () => auth.api.signInEmail({ body: { email: RESET_EMAIL, password: PASSWORD }, asResponse: true });
    const cookie = cookieOf(await login());
    const enabled = await auth.api.enableTwoFactor({ body: { password: PASSWORD, method: "totp" }, headers: { cookie } });
    if (enabled.method !== "totp") throw new Error("esperava TOTP");
    await auth.api.verifyTOTP({ body: { code: await codeFor(secretOf(enabled.totpURI)) }, headers: { cookie } });
    expect((await (await login()).json()).twoFactorRedirect).toBe(true);

    const out = execFileSync("node", ["scripts/reset-2fa.mjs", RESET_EMAIL.toUpperCase()], { encoding: "utf-8", env: process.env });
    expect(out).toContain("2FA removido");

    const row = await db.query.users.findFirst({ where: eq(users.email, RESET_EMAIL) });
    expect(row?.twoFactorEnabled).toBe(false);
    expect(await db.select().from(twoFactors).where(eq(twoFactors.userId, u.id))).toHaveLength(0);
    const audits = (await db.select().from(auditLog).where(eq(auditLog.entityId, u.id))).map((a) => a.action);
    expect(audits).toContain("auth.2fa.reset");
    expect((await (await login()).json()).twoFactorRedirect).toBeFalsy();
  });

  it("recusa e-mail inexistente e uso sem argumento", () => {
    expect(() => execFileSync("node", ["scripts/reset-2fa.mjs", "ninguem@test.local"], { env: process.env, stdio: "pipe" })).toThrow();
    expect(() => execFileSync("node", ["scripts/reset-2fa.mjs"], { env: process.env, stdio: "pipe" })).toThrow();
  });
});
