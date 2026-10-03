# EGD — Fase 17: equipe e permissões (colaborador, convite da equipe, 2FA obrigatório, dispositivo confiável)

**Data:** 2026-10-03
**Status:** aprovado (continuação do backlog pedida em 2026-10-03)
**Base:** "Fora do escopo" da Fase 2 (múltiplos usuários operando em paralelo), da Fase 9 (obrigatoriedade de 2FA por papel; "confiar neste dispositivo") e as colunas `owner_id`/`assignee_id` que o modelo já reserva desde a Fase 2.

## Objetivo

O sistema tem dois papéis: admin (o dono, que vê tudo, inclusive financeiro e auditoria) e cliente. Não há como dar a um colaborador acesso ao trabalho (projetos, demandas, solicitações, atas) sem lhe dar também o CRM, os valores e as chaves de API. Esta fase cria o papel **colaborador**, a tela de equipe com convite, a atribuição com aviso e o filtro "minhas", e fecha dois itens de segurança: 2FA obrigatório por papel e "confiar neste dispositivo" no login.

**Sucesso:** o dono convida um colaborador por e-mail; ele cria a senha, entra em `/admin` e vê só a parte operacional; tudo que é dinheiro, comercial, chaves e auditoria responde 404 para ele; o dono liga a exigência de 2FA e quem não ativou só consegue abrir Minha conta até ativar.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Papéis | `user_role` ganha `collaborator`. Equipe = `admin` + `collaborator`; "dono" = `admin`. Um único nível intermediário. | Permissões por recurso (matriz de 30 telas × N papéis para uma equipe de 2 ou 3 pessoas); papéis por organização (o colaborador é da EGD, não do cliente). |
| O que o colaborador vê | Painel, Projetos (com kanban, gantt, calendário, entregas, templates), Demandas, Atas, Solicitações, Notificações, Minha conta, Arquivos (download). **Não vê**: CRM inteiro, Organizações, Leads, Cases, Arquivos (listagem/upload), API, Automações, Auditoria, Equipe, Configurações, **Financeiro do projeto**, **Relatórios** (portfólio e status trazem custo) e o relatório semanal **vê** (não tem custo). Horas: aponta as próprias; o custo (rate) não aparece para ele. | Esconder só no menu (URL direta continuaria abrindo). |
| Como se aplica | `requireAdmin()` passa a aceitar a equipe inteira (é o que as 70 páginas já chamam). Páginas, layouts e route handlers só do dono chamam `requireOwner()`, que faz `requireAdmin()` e devolve 404 para colaborador (mesmo comportamento do cliente em `/admin`). Form actions dos módulos do dono também usam `requireOwner()`. Menu montado por papel. | Trocar as 70 chamadas por `requireTeam()` (mais diff, mesmo efeito); middleware por prefixo de URL (não cobre server actions). |
| Convite da equipe | Reusa `invitations`: `organization_id` passa a ser opcional e entra `role` (`admin` \| `collaborator`). Convite com `role` cria o usuário com esse papel e sem membership; e-mail e página de aceite dizem "equipe da EGD". Usuário existente que aceita convite da equipe muda de papel (auditado). | Tabela nova (duplicaria token, expiração, reenvio e aceite). |
| Tela da equipe | `/admin/equipe` (dono): lista admins e colaboradores (papel, 2FA, ativo, último login), convite por e-mail com papel, mudar papel, ativar/desativar (não a si mesmo), convites pendentes com reenviar. | Gestão de equipe dentro de Organizações (misturaria cliente com equipe). |
| Atribuição | `project_deliverable.assignee_id` já existe. Quem é atribuído por outra pessoa (criar, editar, atribuir) recebe `deliverable.assigned` (tipo novo, equipe, e-mail ligado por padrão). `/admin/demandas` ganha o atalho **Minhas** (`?responsavel=<eu>`), e o painel, o KPI "Minhas demandas". | Atribuição automática. |
| 2FA obrigatório | Tabela `app_setting (key pk, value jsonb, updated_at, updated_by)`. Chaves `security.require_2fa_team` e `security.require_2fa_client` (padrão `false`). Com a exigência ligada, quem não tem 2FA só abre `/admin/conta` (ou `/portal/conta`): qualquer outra página redireciona para lá com o aviso "Ative a verificação em duas etapas para continuar". O dono liga em `/admin/configuracoes`. O próprio dono sem 2FA também é bloqueado nas demais páginas, mas continua alcançando **Configurações** (para poder desligar a regra) e Minha conta. | Obrigar no login (o plugin não tem esse gancho); exigir no convite (a pessoa precisa entrar para ativar). |
| Dispositivo confiável | Caixa "Confiar neste dispositivo por 30 dias" na etapa do código: `verifyTotp`/`verifyBackupCode` com `trustDevice: true` (cookie assinado do plugin; 30 dias é o padrão dele). | Implementar cookie próprio. |
| Auditoria | `team.invited` (metadata `role`), `user.role_changed` (`from`, `to`), `setting.updated` (`key`, `value`), `project.deliverable.assigned` já existe. | — |

## Telas

- **Sidebar por papel.** Colaborador: Painel, Demandas, Projetos, Atas, Relatório semanal, Templates, Solicitações, Arquivos (só download pela entrega; sem item de menu). Dono: tudo, mais **Equipe** (entre Organizações e Demandas) e **Configurações** (ao fim).
- **`/admin/equipe`**: tabela (nome, e-mail, papel, 2FA, status, último login), formulário "Convidar para a equipe" (e-mail + papel), ações por linha (mudar papel, ativar/desativar), bloco de convites pendentes.
- **`/admin/configuracoes`**: bloco Segurança com dois interruptores (2FA obrigatório para a equipe / para clientes) e a contagem de quem ainda não ativou.
- **Minha conta** (admin e portal): faixa de aviso quando a exigência está ligada e o 2FA desligado.
- **Login**: caixa "Confiar neste dispositivo por 30 dias" na etapa do código.
- **Demandas**: botão **Minhas** ao lado do filtro de responsável; **Painel**: KPI "Minhas demandas".

## Arquitetura

```
src/modules/auth/context.ts        SessionUser.role: admin|collaborator|client; requireAdmin (equipe), requireOwner, isOwner; checagem de 2FA obrigatório
src/modules/auth/schema.ts         enum collaborator
src/modules/settings/{schema,queries,actions,form-actions}.ts  app_setting; getSetting/setSetting; requireTwoFactorFor(role)
src/modules/team/{queries,actions,form-actions,components/}     listTeam, inviteTeamMember, setUserRole, (setUserActive da tenancy)
src/modules/tenancy/{schema,queries,actions}.ts  invitations.role + organization_id opcional; getInvitationByToken com left join; acceptInvitation aplica papel
src/modules/notifications/{kinds,events,recipients}.ts  deliverable.assigned; activeTeam() vs activeOwners()
src/modules/projects/actions.ts    notifica atribuição em create/update/assign
src/modules/auth/components/login-form.tsx  trustDevice
src/app/(admin)/layout.tsx         menu por papel; requireAdmin({ allowWithout2fa: true })
src/app/(admin)/admin/{equipe,configuracoes}/page.tsx
páginas e layouts do dono → requireOwner()
src/db/migrations/0015_team.sql
```

## Testes

- **Unitários**: `navFor(role)` (colaborador não tem CRM/Equipe/Auditoria; dono tem tudo); `kinds` continua consistente; `canAccess`? (não há matriz: o teste é da nav).
- **Integração**: `inviteTeamMember` cria convite com papel e sem organização; `acceptInvitation` cria o usuário como colaborador, sem membership, e muda papel de usuário existente; `setUserRole` audita e recusa rebaixar o último admin; `activeTeam()` inclui colaborador e `activeOwners()` não; atribuição de entrega notifica o atribuído e não quem se atribui; `setSetting`/`getSetting`; `listTeam` traz 2FA e último login.
- **E2E** (`tests/e2e/equipe.spec.ts`): dono convida colaborador → aceita pelo link do Mailpit → cai em `/admin`, menu sem CRM; `/admin/crm/empresas`, `/admin/auditoria`, `/admin/relatorios` e `/admin/projetos/<id>/financeiro` respondem 404; `/admin/projetos` e `/admin/demandas?responsavel=eu` abrem; dono liga "2FA obrigatório para a equipe" em Configurações → colaborador é redirecionado para Minha conta com o aviso; dono desliga. Login com 2FA: caixa "Confiar neste dispositivo" presente (o fluxo de código já é coberto em `two-factor.spec`). Rotas novas em acessibilidade e console limpo.

## Fora do escopo

Permissões por projeto ou por cliente, papéis personalizados, WebAuthn/passkeys, reset de 2FA de outro usuário pela interface (continua pelo script), SSO, log de sessões ativas, convite em massa.
