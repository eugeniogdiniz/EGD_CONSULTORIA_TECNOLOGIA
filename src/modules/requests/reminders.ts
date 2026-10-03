/**
 * Lembrete ao cliente de solicitação parada: a última mensagem não interna é
 * da equipe há 5 dias úteis ou mais, no máximo dois lembretes, com 5 dias
 * úteis entre eles. Regra pura `requestsToRemind`; o carregador e o envio ficam
 * na mesma unidade para a automação.
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessDaysBetween } from "./sla";

export const REMINDER_AFTER_BUSINESS_DAYS = 5;
export const MAX_REMINDERS = 2;

export type ReminderCandidate = {
  id: string;
  title: string;
  status: string;
  organizationId: string;
  organizationName: string;
  reminderCount: number;
  lastReminderAt: Date | null;
  /** última mensagem não interna: quem e quando (null = só o texto inicial do cliente) */
  lastAuthorRole: "admin" | "client" | null;
  lastMessageAt: Date | null;
};

export function requestsToRemind<T extends ReminderCandidate>(rows: T[], now: Date): (T & { idleBusinessDays: number })[] {
  const out: (T & { idleBusinessDays: number })[] = [];
  for (const r of rows) {
    if (r.status === "resolved") continue;
    if (r.lastAuthorRole !== "admin" || !r.lastMessageAt) continue;
    if (r.reminderCount >= MAX_REMINDERS) continue;
    const idle = businessDaysBetween(r.lastMessageAt, now);
    if (idle < REMINDER_AFTER_BUSINESS_DAYS) continue;
    if (r.lastReminderAt && businessDaysBetween(r.lastReminderAt, now) < REMINDER_AFTER_BUSINESS_DAYS) continue;
    out.push({ ...r, idleBusinessDays: Math.floor(idle) });
  }
  return out;
}

/** Solicitações não resolvidas com a última mensagem não interna e os contadores de lembrete. */
export async function loadReminderCandidates(): Promise<ReminderCandidate[]> {
  const rows = await db.execute<{
    id: string;
    title: string;
    status: string;
    organization_id: string;
    organization_name: string;
    reminder_count: number;
    last_reminder_at: Date | null;
    last_author_role: "admin" | "client" | null;
    last_message_at: Date | null;
  }>(sql`
    select r.id, r.title, r.status::text as status, r.organization_id, o.name as organization_name,
           r.reminder_count, r.last_reminder_at,
           (select u.role::text from portal_request_message m join users u on u.id = m.author_id
             where m.request_id = r.id and m.internal = false order by m.created_at desc limit 1) as last_author_role,
           (select m.created_at from portal_request_message m
             where m.request_id = r.id and m.internal = false order by m.created_at desc limit 1) as last_message_at
    from portal_request r
    join organizations o on o.id = r.organization_id
    where r.status <> 'resolved' and o.status = 'active'
    order by r.updated_at asc
  `);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    reminderCount: r.reminder_count,
    lastReminderAt: r.last_reminder_at ? new Date(r.last_reminder_at) : null,
    lastAuthorRole: r.last_author_role,
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at) : null,
  }));
}
