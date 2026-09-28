"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { acceptInvitation } from "@/modules/tenancy/actions";

export type AcceptState = ActionResult<null> | null;

/**
 * Aceita o convite. Usuário novo: cria conta + sessão e vai para o portal.
 * Usuário existente: só vincula a organização e volta ao login.
 * Para usuário existente o formulário manda nome e senha fixos, ignorados pelo domínio.
 */
export async function acceptInviteAction(_prev: AcceptState, fd: FormData): Promise<AcceptState> {
  const r = await acceptInvitation(
    {
      token: String(fd.get("token") ?? ""),
      name: String(fd.get("name") ?? ""),
      password: String(fd.get("password") ?? ""),
    },
    await headers(),
  );
  if (!r.ok) return r;
  redirect(r.data.existingUser ? "/entrar?convite=aceito" : "/portal");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/entrar");
}
