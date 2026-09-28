"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { leads } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { createRateLimiter } from "@/lib/rate-limit";
import { audit } from "@/modules/audit/log";
import { sendLeadNotification } from "@/modules/mail/send";
import { leadSchema } from "./validation";

/*
 * Este arquivo É uma server action pública: submitContact não recebe
 * contexto de autorização porque o formulário do site é anônimo. Nada
 * que exija permissão pode ser exportado daqui (ver admin-actions.ts).
 */

export type ContactState = ActionResult<null> | null;

const contactLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 3 });

async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  // HMAC com chave: o espaço IPv4 é pequeno demais para um hash sem sal ser pseudonimização
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(ip).digest("hex").slice(0, 32);
}

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // honeypot: bots preenchem o campo oculto; respondemos sucesso sem gravar
  if (String(formData.get("website") ?? "") !== "") return ok(null);

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const ipHash = await clientIpHash();
  if (!contactLimiter.hit(ipHash).allowed) {
    return fail("Recebemos várias mensagens deste endereço. Tente novamente em uma hora.");
  }

  const [row] = await db
    .insert(leads)
    .values({ ...parsed.data, ipHash })
    .returning({ id: leads.id });
  await audit({
    actorId: null,
    action: "lead.created",
    entityType: "lead",
    entityId: row.id,
    metadata: { email: parsed.data.email, company: parsed.data.company },
  });
  await sendLeadNotification({
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
    message: parsed.data.message,
  });
  return ok(null);
}
