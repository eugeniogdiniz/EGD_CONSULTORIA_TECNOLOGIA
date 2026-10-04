/**
 * Tipos de notificação. Lista fechada: a tela de preferências, o sino e os
 * testes derivam daqui. `audience` diz quem recebe; `emailable` diz se o tipo
 * pode virar e-mail (a preferência da pessoa decide se vira de fato).
 */
export type Audience = "admin" | "client";

export type NotificationKind = {
  key: string;
  audience: Audience;
  label: string;
  description: string;
  emailable: boolean;
};

export const KINDS = [
  { key: "request.created", audience: "admin", label: "Nova solicitação", description: "Um cliente abriu uma solicitação no portal.", emailable: true },
  { key: "request.client_reply", audience: "admin", label: "Resposta do cliente", description: "Um cliente respondeu a uma solicitação.", emailable: true },
  { key: "comment.client", audience: "admin", label: "Comentário do cliente", description: "Um cliente comentou numa entrega.", emailable: true },
  { key: "lead.created", audience: "admin", label: "Novo lead", description: "Alguém entrou em contato pelo site ou pela API.", emailable: true },
  { key: "proposal.expired", audience: "admin", label: "Proposta expirada", description: "Uma proposta enviada passou da validade (entra também no resumo diário).", emailable: false },
  { key: "request.assigned", audience: "admin", label: "Solicitação atribuída a você", description: "Alguém da equipe definiu você como responsável por uma solicitação.", emailable: true },
  { key: "deliverable.assigned", audience: "admin", label: "Entrega atribuída a você", description: "Alguém da equipe atribuiu uma entrega a você.", emailable: true },
  { key: "invoice.overdue", audience: "admin", label: "Parcelas vencidas", description: "Um aviso por dia com as parcelas a receber vencidas (só para administradores).", emailable: true },
  { key: "error.spike", audience: "admin", label: "Erro novo no servidor", description: "Uma origem de erro apareceu pela primeira vez (ou voltou depois de resolvida).", emailable: true },
  { key: "backup.failed", audience: "admin", label: "Backup falhou", description: "O backup lógico diário não concluiu.", emailable: true },
  { key: "webhook.disabled", audience: "admin", label: "Webhook desativado", description: "Um destino de webhook falhou 20 vezes seguidas e foi desativado.", emailable: true },
  { key: "api_key.expiring", audience: "admin", label: "Chave de API expirando", description: "Uma chave de API expira em 14 ou em 3 dias.", emailable: true },
  { key: "request.team_reply", audience: "client", label: "Resposta da equipe", description: "A EGD respondeu a uma solicitação da sua organização.", emailable: true },
  { key: "comment.team", audience: "client", label: "Comentário da equipe", description: "A EGD comentou numa entrega compartilhada com você.", emailable: true },
  { key: "deliverable.done", audience: "client", label: "Entrega concluída", description: "Uma entrega compartilhada com você foi concluída.", emailable: true },
  { key: "meeting.shared", audience: "client", label: "Ata compartilhada", description: "A EGD compartilhou uma ata de reunião com você.", emailable: true },
  { key: "request.reminder", audience: "client", label: "Lembrete de solicitação", description: "Uma solicitação da sua organização aguarda seu retorno há alguns dias.", emailable: true },
] as const satisfies readonly NotificationKind[];

export type KindKey = (typeof KINDS)[number]["key"];

export const isKind = (v: string): v is KindKey => KINDS.some((k) => k.key === v);
export const getKind = (key: KindKey): NotificationKind => KINDS.find((k) => k.key === key)!;
export const kindsFor = (audience: Audience): NotificationKind[] => KINDS.filter((k) => k.audience === audience);

export type Recipient = { id: string; email: string; name: string };
export type PreferenceRow = { userId: string; kind: string; email: boolean };

/**
 * Quem recebe e-mail: tipo e-mailável, e a preferência (user, kind) ausente ou ligada.
 * `excludeUserId` (quem causou o evento) sai antes.
 */
export function pickEmailRecipients(recipients: Recipient[], prefs: PreferenceRow[], kind: KindKey, excludeUserId?: string | null): Recipient[] {
  if (!getKind(kind).emailable) return [];
  return recipients.filter((r) => {
    if (r.id === excludeUserId) return false;
    const pref = prefs.find((p) => p.userId === r.id && p.kind === kind);
    return pref ? pref.email : true;
  });
}

/** Texto curto para o sino: "agora", "há 5 min", "há 3 h", "há 2 d" ou a data. */
export function relativeTime(from: Date, now: Date): string {
  const s = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(from);
}

/** Corpo truncado para a lista. */
export const excerpt = (s: string | null | undefined, max = 160) => (!s ? null : s.length > max ? `${s.slice(0, max - 1)}…` : s);
