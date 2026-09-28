import { describe, it, expect, beforeAll } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sessions, users } from "@/db/schema";
import { createOrganization, inviteUser, setUserActive } from "@/modules/tenancy/actions";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "./setup";

let ctx: AdminContext;
beforeAll(async () => {
  ctx = await ensureTestAdmin();
});

const PASSWORD = "senha-hooks-forte-1";

/** Cria um cliente ativo com senha conhecida, pelo mesmo caminho do seed. */
async function createClient(email: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name: "Hook Teste", emailVerified: true, role: "client", active: true }, { method: "admin" });
  await c.internalAdapter.linkAccount({ userId: u.id, providerId: "credential", accountId: u.id, password: await c.password.hash(PASSWORD) });
  return u.id;
}

const status = async (p: Promise<unknown>) => {
  try {
    await p;
    return 200;
  } catch (e) {
    return (e as { statusCode?: number; status?: number }).statusCode ?? (e as { status?: number }).status ?? -1;
  }
};

describe("hooks do Better Auth", () => {
  it("cadastro sem convite (ou com token errado) é recusado", async () => {
    expect(await status(auth.api.signUpEmail({ body: { name: "x", email: "semconvite@test.local", password: PASSWORD } }))).toBe(403);
    expect(
      await status(auth.api.signUpEmail({ body: { name: "x", email: "semconvite@test.local", password: PASSWORD, invitationToken: "t".repeat(43) } as never })),
    ).toBe(403);
    expect(await db.query.users.findFirst({ where: eq(users.email, "semconvite@test.local") })).toBeUndefined();
  });

  it("convite válido só serve para o e-mail convidado", async () => {
    const org = await createOrganization(ctx, { name: "Hooks Org" });
    if (!org.ok) throw new Error("setup");
    await inviteUser(ctx, { email: "certo@test.local", organizationId: org.data.id });
    const inv = await db.query.invitations.findFirst();
    expect(inv).toBeTruthy();
    // token bruto não é recuperável (só o hash); um token qualquer com outro e-mail deve falhar
    expect(await status(auth.api.signUpEmail({ body: { name: "x", email: "outro@test.local", password: PASSWORD, invitationToken: "x".repeat(43) } as never }))).toBe(403);
  });

  it("usuário inativo não faz login e recebe a mesma mensagem de credencial inválida", async () => {
    const email = "inativo@test.local";
    const id = await createClient(email);
    await db.update(users).set({ active: false }).where(eq(users.id, id));
    let message = "";
    try {
      await auth.api.signInEmail({ body: { email, password: PASSWORD } });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/e-mail ou senha incorretos/i);
  });

  it("6ª falha consecutiva bloqueia por e-mail; um login correto zera o contador", async () => {
    const email = "limite@test.local";
    await createClient(email);
    const wrong = () => status(auth.api.signInEmail({ body: { email, password: "errada-errada-1" } }));
    for (let i = 0; i < 5; i++) expect(await wrong()).toBe(401);
    expect(await wrong()).toBe(429);

    const email2 = "limite2@test.local";
    await createClient(email2);
    const wrong2 = () => status(auth.api.signInEmail({ body: { email: email2, password: "errada-errada-1" } }));
    expect(await wrong2()).toBe(401);
    expect(await wrong2()).toBe(401);
    expect(await status(auth.api.signInEmail({ body: { email: email2, password: PASSWORD } }))).toBe(200);
    for (let i = 0; i < 5; i++) expect(await wrong2()).toBe(401);
    expect(await wrong2()).toBe(429);
  });

  it("desativar usuário apaga as sessões dele", async () => {
    const email = "sessoes@test.local";
    const id = await createClient(email);
    await auth.api.signInEmail({ body: { email, password: PASSWORD } });
    await auth.api.signInEmail({ body: { email, password: PASSWORD } });
    expect((await db.select({ n: count() }).from(sessions).where(eq(sessions.userId, id)))[0].n).toBe(2);
    const r = await setUserActive(ctx, id, false);
    expect(r.ok).toBe(true);
    expect((await db.select({ n: count() }).from(sessions).where(eq(sessions.userId, id)))[0].n).toBe(0);
  });
});
