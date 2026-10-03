import { createAuthMiddleware, APIError } from "better-auth/api";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, users } from "@/db/schema";
import { hashToken } from "@/modules/tenancy/tokens";
import { normalizeEmail } from "./normalize-email";
import { isPwnedPassword } from "./hibp";
import { loginByEmail } from "./login-limiter";

const PASSWORD_PATHS = new Set(["/sign-up/email", "/reset-password", "/change-password"]);

/**
 * Regras que rodam antes dos endpoints do Better Auth:
 * - login: limite por e-mail e bloqueio de usuário inativo (mesma mensagem
 *   de credencial inválida, para não revelar o status);
 * - cadastro: só com convite válido para o mesmo e-mail (não há cadastro aberto);
 * - qualquer definição de senha: recusa senhas vazadas (HIBP).
 */
export const beforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/sign-in/email") {
    const email = normalizeEmail(String(ctx.body?.email ?? ""));
    if (!(await loginByEmail.hit(email)).allowed) {
      throw new APIError("TOO_MANY_REQUESTS", { message: "Muitas tentativas. Aguarde 15 minutos." });
    }
    const u = await db.query.users.findFirst({ where: eq(users.email, email), columns: { active: true } });
    if (u && !u.active) {
      throw new APIError("UNAUTHORIZED", { message: "E-mail ou senha incorretos." });
    }
    ctx.body.email = email;
  }

  if (ctx.path === "/sign-up/email") {
    const token = String(ctx.body?.invitationToken ?? "");
    const email = normalizeEmail(String(ctx.body?.email ?? ""));
    const inv = token
      ? await db.query.invitations.findFirst({
          where: and(
            eq(invitations.tokenHash, hashToken(token)),
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date()),
          ),
        })
      : undefined;
    if (!inv || inv.email !== email) {
      throw new APIError("FORBIDDEN", { message: "Convite inválido ou expirado." });
    }
    ctx.body.email = email;
    delete ctx.body.invitationToken;
  }

  if (PASSWORD_PATHS.has(ctx.path)) {
    const pw = String(ctx.body?.password ?? ctx.body?.newPassword ?? "");
    if (pw && (await isPwnedPassword(pw))) {
      throw new APIError("BAD_REQUEST", {
        message: "Essa senha apareceu em vazamentos públicos. Escolha outra.",
      });
    }
  }
});
