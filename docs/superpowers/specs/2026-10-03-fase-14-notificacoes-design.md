# EGD — Fase 14: notificações no sistema e preferências por e-mail

**Data:** 2026-10-03
**Status:** aprovado (o dono pediu para seguir com o backlog priorizado em 2026-10-03)
**Base:** backlog das Fases 3, 3.5 e 4 ("notificações in-app ou por e-mail quando admin muda algo ou cliente comenta") e da Fase 13 ("preferências por usuário admin", "notificação in-app").
**Mockup:** sem mockup próprio; o sino e as listas seguem o shell e os blocos das telas existentes.

## Objetivo

Hoje cada aviso é um e-mail solto para um endereço fixo (`ADMIN_NOTIFY_EMAIL`) ou para o autor de uma solicitação. Quem abre o sistema não encontra nada: o painel mostra comentários de clientes, mas uma solicitação respondida, uma entrega concluída ou uma ata compartilhada não aparecem em lugar nenhum para quem precisa saber. Esta fase cria uma **central de notificações** para admin e cliente, com um sino no topo, uma página com o histórico e **preferências por pessoa** do que também chega por e-mail.

**Sucesso:** toda ação relevante de uma parte aparece para a outra no sistema no próximo carregamento de página, com link direto para o item; a pessoa escolhe em "Minha conta" o que recebe por e-mail; nenhum e-mail passa a ser enviado para quem não recebia antes sem ter ligado.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Modelo | Tabela `notification` com uma linha **por destinatário** (`user_id`), tipo (`kind`), título, corpo curto, `url` relativa, entidade e `read_at`. | Uma linha por evento com tabela de leitura (mais junções para o caso simples); evento genérico lido da auditoria (a auditoria não tem destinatário nem texto para pessoa). |
| Quem recebe | Eventos de cliente → **todos os admins ativos**. Eventos da equipe → **membros ativos da organização** dona do item (não só o autor da solicitação: a organização é o cliente). | Só o autor (um colega da mesma empresa não saberia da resposta); admin responsável pela entrega (ainda não há atribuição consistente). |
| E-mail | Continua existindo, agora **por pessoa**: cada destinatário recebe se a preferência do tipo estiver ligada. Sem linha em `notification_preference` = **ligado** (quem recebia continua recebendo). Eventos de cliente deixam de ir para `ADMIN_NOTIFY_EMAIL` e passam para o e-mail de cada admin. | Manter `ADMIN_NOTIFY_EMAIL` para tudo (duplicaria para o dono, que é o admin); e-mail padrão desligado (perderia avisos de hoje). |
| `ADMIN_NOTIFY_EMAIL` | Fica só para os resumos da Fase 13 e para o lead do site. | Removê-la (os resumos são da equipe, não de uma pessoa). |
| Tipos | Lista fechada em código (`kinds.ts`), com público (`admin` ou `client`), rótulo e se é "e-mailável". A tela de preferências e a tabela derivam dela. | Tipos livres (a tela de preferências não teria o que listar). |
| Disparo | Função única `notify()` chamada pelas actions que hoje mandam e-mail (solicitações, comentário de cliente, lead) e por quatro pontos novos (comentário da equipe, entrega concluída, ata compartilhada, proposta expirada). Nunca lança: falha vira `logger.error`. | Trigger no banco (sem acesso ao texto nem ao e-mail); fila (sem infra). |
| Leitura | Clicar numa notificação passa por `/<área>/notificacoes/[id]/abrir`, que marca lida e redireciona para a `url`. "Marcar todas como lidas" é um formulário. | Marcar lida ao renderizar (perde o "não lida" quando a pessoa só passa pela lista). |
| Tempo real | Não. O sino é renderizado no servidor a cada navegação (os layouts já são `force-dynamic`). | Polling ou SSE (custo e complexidade sem demanda; fica no backlog). |
| Retenção | Automação diária `notificacoes-limpar` (03:00): apaga lidas com mais de 90 dias e não lidas com mais de 180. Entra em `/admin/automacoes` como as outras. | Manter para sempre (tabela cresce sem valor). |
| Auditoria | `notification.preference.updated` (metadata `kind`, `email`) e `notification.read_all`. Criar e ler uma notificação não auditam (ruído). | — |

## Tipos de notificação

| `kind` | Público | Quando | Título (exemplo) | E-mail |
|---|---|---|---|---|
| `request.created` | admin | cliente abre solicitação | "Nova solicitação de Org A: Acesso ao servidor" | o mesmo e-mail de hoje |
| `request.client_reply` | admin | cliente responde | "Maria (Org A) respondeu: Acesso ao servidor" | o mesmo de hoje |
| `comment.client` | admin | cliente comenta numa entrega | "Maria comentou em Laudo final" | o mesmo de hoje |
| `lead.created` | admin | lead pelo site ou API | "Novo lead: João (Empresa X)" | o mesmo de hoje, por admin (e `ADMIN_NOTIFY_EMAIL` continua) |
| `proposal.expired` | admin | automação expira proposta | "Proposta PROP-26-003 expirou" | não (entra no resumo diário) |
| `request.team_reply` | client | equipe responde ou converte em entrega | "A EGD respondeu: Acesso ao servidor" | o mesmo de hoje |
| `comment.team` | client | equipe comenta numa entrega visível | "A EGD comentou em Laudo final" | novo |
| `deliverable.done` | client | entrega visível passa a concluída | "Entrega concluída: Laudo final" | novo |
| `meeting.shared` | client | ata passa a compartilhada | "Ata compartilhada: Reunião de kickoff" | novo |

Regras de escopo herdadas: cliente só é notificado de entrega `visible_to_client`, de ata `shared_with_client` e de solicitações da própria organização. Membros inativos (`users.active = false`) e organizações inativas não recebem. Quem causou o evento não é notificado dele (a equipe não recebe o próprio comentário).

## Telas

- **Sino** no topo do admin e do portal (`AppShell`, à esquerda do menu do usuário): botão com contagem de não lidas (até "99+"); abre um menu com as 8 mais recentes (título, corpo truncado, "há 5 min", ponto de não lida), "Ver todas" e "Marcar todas como lidas". Sem notificação: "Nada por aqui."
- **`/admin/notificacoes`** e **`/portal/notificacoes`**: as 50 mais recentes, não lidas em destaque, filtro "Só não lidas", botão "Marcar todas como lidas". Cada item é um link para `/…/notificacoes/[id]/abrir`.
- **Preferências** em `/admin/conta` e `/portal/conta`: bloco "Notificações por e-mail" com um interruptor por tipo do público da pessoa (mesmo componente visual do interruptor das automações). Texto: "No sistema você recebe tudo. Aqui você escolhe o que também chega por e-mail."
- `/admin/automacoes` ganha a linha "Limpar notificações antigas".

## Arquitetura

```
src/modules/notifications/
  schema.ts        notification, notification_preference
  kinds.ts         KINDS (key, audience, label, description, emailable), isKind, kindsFor(audience)
  recipients.ts    activeAdmins(), organizationMembers(orgId), deliverableAudience(deliverableId), meetingAudience(meetingId)
  notify.ts        notify({ kind, title, body, url, entity, organizationId, recipients, mail?, excludeUserId? }) → { inApp, emailed }
  queries.ts       countUnread(userId), listRecent(userId, limit), listNotifications(userId, { unreadOnly, limit }), listPreferences(userId)
  actions.ts       openNotification (marca lida, devolve url), markAllRead, setPreference
  form-actions.ts  markAllReadForm, setPreferenceForm (admin e portal)
  components/
    notification-bell.tsx   (client: DropdownMenu com itens recebidos por props)
    notification-list.tsx   (server)
    preferences-form.tsx    (server: um formulário-interruptor por tipo)
  cleanup.ts       deleteOldNotifications(now) (automação)
src/modules/mail/templates.ts   renderTeamCommentNotification, renderDeliverableDoneNotification, renderMeetingSharedNotification
src/app/(admin)/admin/notificacoes/page.tsx  + [id]/abrir/route.ts
src/app/(portal)/portal/notificacoes/page.tsx + [id]/abrir/route.ts
src/app/(admin)/layout.tsx, src/app/(portal)/layout.tsx   sino com dados
src/components/shell/app-shell.tsx   slot `bell`
src/db/migrations/0012_notifications.sql
```

Tabelas:

```sql
notification (id uuid pk, user_id uuid not null references users on delete cascade,
              kind text not null, title text not null, body text null, url text not null,
              entity_type text null, entity_id text null, organization_id uuid null,
              read_at timestamptz null, created_at timestamptz not null default now())
index notification_user_created_idx on notification (user_id, created_at desc)
index notification_user_unread_idx on notification (user_id) where read_at is null
notification_preference (user_id uuid references users on delete cascade, kind text not null,
                         email boolean not null, updated_at timestamptz not null default now(),
                         primary key (user_id, kind))
```

`notify()`: resolve destinatários (lista de `{ id, email, name }`), remove `excludeUserId` e inativos, insere as linhas em um `insert` só, carrega as preferências de `(user, kind)` e, para cada destinatário com e-mail permitido (e tipo e-mailável e `mail` informado), chama `deliver()`. Devolve contagens para testes e logs. As actions existentes trocam `sendRequestNotification`/`sendClientCommentNotification` por `notify()` com o mesmo template; o lead continua mandando para `ADMIN_NOTIFY_EMAIL` **e** notifica os admins.

## Testes

- **Unitários** (`tests/unit/notifications/`): `kinds` (todo tipo tem rótulo e público; `kindsFor`); `pickEmailRecipients(recipients, prefs, kind)` (sem linha = ligado; linha `false` desliga; tipo não e-mailável nunca manda; `excludeUserId` sai); `relativeTime`; templates novos (assunto e `esc`).
- **Integração** (`tests/integration/notifications/`): `notify` para admins cria uma linha por admin ativo e nenhuma para inativo; preferência desligada zera `emailed`; comentário da equipe em entrega interna não notifica cliente; em entrega visível notifica os membros da organização e não os de outra; `openNotification` de outro usuário devolve `null`; `markAllRead` só do próprio; `deleteOldNotifications` apaga lidas > 90 d e mantém recentes.
- **E2E** (`tests/e2e/notificacoes.spec.ts`): cliente abre solicitação → admin vê "1" no sino, abre o menu, clica no item, cai na solicitação e o contador some; admin desliga o e-mail de "Nova solicitação" em Minha conta e o interruptor persiste; equipe responde → cliente vê a notificação no sino e em `/portal/notificacoes`; "Marcar todas como lidas" zera. Rotas novas em `acessibilidade.spec.ts` e `console-limpo.spec.ts`.

## Fora do escopo

Tempo real (SSE/polling), notificações por WhatsApp/SMS, agrupamento ("3 comentários em…"), notificação de entrega atrasada (coberta pelo resumo diário), preferência de horário/resumo de e-mails, e-mail para `ADMIN_NOTIFY_EMAIL` dos eventos de cliente (passa a ir por pessoa).
