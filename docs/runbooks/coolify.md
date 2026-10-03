# Runbook: provisionar o Coolify e publicar egdsystem.com.br

Passo a passo para colocar o sistema no ar num VPS Hostinger com Coolify (o provisionamento é o da Fase 1; as seções 9, 11, 12 e 14 cobrem o que as fases seguintes acrescentaram). Os passos de painel e DNS são do Eugênio; os comandos são para rodar no VPS via SSH ou na máquina local, conforme indicado.

Referências: spec `docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md` §7, `Dockerfile`, `.env.example`.

## 1. VPS (estado real em 2026-09-27)

- `srv1906344`, IP `187.127.51.52`, Ubuntu 24.04, **1 vCPU, 3,8 GB de RAM**, 48 GB de disco. Acesso SSH por chave (`ssh egd-vps` na máquina do Eugênio).
- O VPS é **compartilhado**: já roda o Coolify 4.3 com outros projetos (uma API, um site e dois Postgres). Nada desses recursos deve ser alterado.
- Com 1 vCPU, **a imagem não é construída no VPS**: o CI do GitHub constrói e publica em `ghcr.io/eugeniogdiniz/egd-app` (tags `main`, `sha-<commit>` e `latest`), e o Coolify faz o deploy a partir da imagem pronta.
- Firewall `ufw` está inativo; o Traefik do Coolify expõe 80/443. Recomendado ativar `ufw` liberando só 22, 80 e 443 quando conveniente (avaliar impacto nos outros projetos antes).

## 2. Coolify

Já instalado (painel em `http://187.127.51.52:8000`, conta de administrador existente). Opcional: em **Settings** definir o domínio do painel como `https://coolify.egdsystem.com.br` após o DNS. Ative 2FA na conta.

Para automação (o Claude configura os recursos pela API): **Keys & Tokens → API tokens → Create** com permissão de escrita.

## 3. DNS (painel do domínio egdsystem.com.br)

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | `@` | IP do VPS | 300 |
| A | `www` | IP do VPS | 300 |
| A | `coolify` | IP do VPS | 300 |
| A | `storage` | IP do VPS | 300 |
| A | `storage-console` | IP do VPS | 300 |

Confirme com `nslookup egdsystem.com.br` antes de seguir. O Coolify emite certificados Let's Encrypt automaticamente quando o domínio aponta para o VPS.

## 4. Projeto e recursos no Coolify

Crie o projeto **EGD** (ambiente `production`) e adicione, nesta ordem:

### 4.1 PostgreSQL 16

- **New Resource → Database → PostgreSQL**, versão 16, nome `egd-db`, banco `egd`.
- Deixe sem porta pública. Copie a **Internal URL** (formato `postgres://usuario:senha@egd-db:5432/egd`).

### 4.2 Armazenamento S3-compatível (RustFS)

As imagens do MinIO saíram dos registros públicos; usamos RustFS, que expõe a mesma API.

- **New Resource → Docker Image**, imagem `rustfs/rustfs:latest`, nome `egd-storage`.
- Variáveis: `RUSTFS_ACCESS_KEY` e `RUSTFS_SECRET_KEY` com valores longos gerados por `openssl rand -hex 24` cada um; `RUSTFS_CONSOLE_ENABLE=true`.
- Volume persistente: `/data`.
- Portas e domínios: **9000 (API S3) com domínio `https://storage.egdsystem.com.br`** e 9001 (console) com domínio `https://storage-console.egdsystem.com.br`. A API precisa ser pública porque os links de download são URLs assinadas que o navegador do cliente abre direto no storage (validade de 5 minutos, assinatura por arquivo). O app faz uploads pelo endereço interno `http://egd-storage:9000` e assina os downloads com o endereço público.
- O bucket `egd` é criado pelo próprio app na primeira gravação; não precisa criar à mão.

### 4.3 Aplicação

- **New Resource → Application → Docker Image**, imagem `ghcr.io/eugeniogdiniz/egd-app:main` (pacote público; se ficar privado, cadastre as credenciais do GHCR no Coolify), porta `3000`.
- Domínio: `https://egdsystem.com.br`. Em **Settings → Domains** adicione também `https://www.egdsystem.com.br` e marque redirecionamento para o apex.
- Healthcheck: path `/api/health`, porta 3000.
- Redeploy: após cada push na `main` o CI publica a imagem nova; dispare o deploy pelo botão **Redeploy** ou pelo webhook de deploy da aplicação (Coolify → Application → Webhooks), que pode ser chamado pelo CI com um token de API guardado como secret do GitHub (`COOLIFY_DEPLOY_URL`, `COOLIFY_TOKEN`).

## 5. Variáveis de ambiente da aplicação

Em **Environment Variables** da aplicação, marque todas como **Build & Runtime** desmarcado (só runtime), exceto nenhuma: o build não usa segredos.

| Chave | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal URL do Postgres (4.1) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
| `BETTER_AUTH_URL` | `https://egdsystem.com.br` |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `no-reply@egdsystem.com.br` (crie a caixa no painel de e-mail da Hostinger antes) |
| `SMTP_PASS` | senha da caixa |
| `MAIL_FROM` | `EGD <no-reply@egdsystem.com.br>` |
| `ADMIN_NOTIFY_EMAIL` | seu e-mail para receber leads |
| `S3_ENDPOINT` | `http://egd-storage:9000` (rede interna: uploads) |
| `S3_PUBLIC_ENDPOINT` | `https://storage.egdsystem.com.br` (assina os links de download) |
| `S3_BUCKET` | `egd` |
| `S3_ACCESS_KEY` | mesmo valor de `RUSTFS_ACCESS_KEY` |
| `S3_SECRET_KEY` | mesmo valor de `RUSTFS_SECRET_KEY` |
| `SEED_ADMIN_EMAIL` | seu e-mail de admin (só para o passo 7; remover depois) |
| `SEED_ADMIN_PASSWORD` | senha inicial forte (só para o passo 7; remover depois) |

Se alguma variável estiver ausente ou inválida, o servidor falha ao iniciar com a mensagem `Variáveis de ambiente inválidas` listando a chave, e o healthcheck (`/api/health`, que também testa o banco) fica vermelho: o Coolify não troca a versão anterior.

## 6. Primeiro deploy

Clique em **Deploy**. Acompanhe os logs: o build leva alguns minutos; o container imprime `aplicando migrations...`, `migrations aplicadas` e `iniciando servidor`. Confirme:

```bash
curl https://egdsystem.com.br/api/health
```

Resposta esperada: `{"ok":true,"ts":"..."}`.

## 7. Criar o admin inicial

O seed é um script TypeScript; rode-o da sua máquina apontando para o Postgres de produção por túnel SSH:

```bash
# terminal 1: túnel (troque IP e nome do container conforme o Coolify mostrar)
ssh -L 5433:egd-db:5432 root@IP-DO-VPS

# terminal 2: na pasta do projeto
DATABASE_URL=postgres://usuario:senha@localhost:5433/egd \
SEED_ADMIN_EMAIL=seu@email \
SEED_ADMIN_PASSWORD='senha-inicial-forte' \
npm run db:seed
```

Se o túnel direto ao nome do container não resolver, use `docker inspect egd-db` no VPS para pegar o IP interno e substitua `egd-db` por ele.

Depois, remova `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` das variáveis da aplicação e faça **Redeploy**. Troque a senha inicial em `/admin/conta`.

## 8. Backup do Postgres

Em **egd-db → Backups**: agende backup diário às 03:00, retenção de 14 dias. Destino: S3-compatível apontando para o próprio RustFS (bucket `backups`, endpoint interno) ou um storage externo da sua escolha. Clique em **Backup now** e confirme que o arquivo aparece na lista. Baixe um backup e teste a restauração localmente ao menos uma vez.

## 9. Verificação de pronto (critérios da spec)

1. `https://egdsystem.com.br` abre com cadeado e as seis páginas respondem.
2. Login em `/admin` com o admin do seed.
3. Criar uma organização e convidar um e-mail real seu; o e-mail chega com o link `/convite/...`.
4. Aceitar o convite em outra janela anônima; o portal mostra só aquela organização.
5. Enviar o formulário de contato em produção: aparece em `/admin/leads` e chega o e-mail em `ADMIN_NOTIFY_EMAIL`.
6. Em `/admin/arquivos`, enviar um arquivo e baixar pelo link **de uma máquina fora do VPS** (o link abre `storage.egdsystem.com.br`).
7. `/admin/auditoria` lista os eventos acima.

Depois das Fases 5 a 9:

8. `/cases` mostra os 13 cases (a migration `0004` os semeia) e `/admin/cases` permite editar; salvar reflete no site.
9. Em `/admin/api`, criar uma chave com `cases:read`, chamar `curl -H "Authorization: Bearer <chave>" https://egdsystem.com.br/api/v1/cases` e ver `200`; sem a chave, `401`. Revogar e ver `401`.
10. No portal (convidado do passo 4): abrir uma solicitação em `/portal/solicitacoes`; o e-mail chega em `ADMIN_NOTIFY_EMAIL`; responder em `/admin/solicitacoes` e o e-mail chega ao cliente.
11. Em `/admin/conta`, ativar a verificação em duas etapas, guardar os códigos de recuperação, sair e entrar de novo pedindo o código.

## 10. Desligar o GitHub Pages

No repositório: **Settings → Pages → Source: None**. Depois execute a Task 18 do plano (remove `legacy/` e `.github/workflows/pages.yml`).

## 11. Proxy e IP do cliente

O Traefik do Coolify deve ser a única porta de entrada (80/443) para o container: o app confia no primeiro valor de `x-forwarded-for` para limitar envios do formulário de contato, tentativas de login e, na API pública (`/api/v1/*`), tentativas com chave inválida (30 por minuto por IP). Não exponha a porta 3000 do container publicamente. Sem esse cabeçalho todos os clientes caem no mesmo balde `unknown`.

Os limites de taxa (contato, login, API) ficam **em memória, por processo**: valem para um container só. Com mais de uma réplica cada uma conta separado.

Recomendado no Traefik/Coolify: um limite de tamanho de corpo de requisição (por exemplo 1 MB para `/api/`). O app recusa `POST /api/v1/leads` acima de 32 KB, mas só consegue medir o corpo depois de recebê-lo quando não há `content-length`.

## 12. Rollback

**Application → Deployments**: escolha um deploy anterior e clique em **Redeploy**. As migrations até a `0010` só acrescentam (tabelas, colunas, tipos, índices, restrições e um gatilho; nenhuma remove ou altera dados existentes), então a versão anterior do app continua funcionando sobre o banco novo: um rollback de app não exige rollback de banco. Antes de uma migration que remova ou altere colunas, faça um backup manual (seção 8).

## 13. Operação do dia a dia

- Logs: **Application → Logs** (o app escreve JSON, uma linha por evento; erros trazem `digest`, que é o código que a tela de erro mostra ao usuário).
- Atualizar: o push na `main` faz o CI publicar a imagem `ghcr.io/eugeniogdiniz/egd-app:main` (e `sha-<commit>`) e, com os testes verdes, o job `deploy` do CI dispara o deploy no Coolify via API (secrets `COOLIFY_DEPLOY_URL` e `COOLIFY_TOKEN` no GitHub; o token precisa da permissão **deploy**). Falha de migration mantém a versão anterior no ar. Fallback manual: **Application → Deploy** no Coolify, ou `POST /api/v1/deploy?uuid=<uuid-da-aplicação>` com o token.
- A aplicação ficou presa na tag `fase-1-fundacao` até 2026-09-30, o que deixou as Fases 2 a 11 fora do ar mesmo já estando na `main`. Confira a tag em **Application → General → Docker Image Tag** antes de investigar "a mudança não apareceu".
- Certificado: o Traefik tenta o Let's Encrypt quando o domínio aparece na configuração. Se o DNS ainda não existia naquele momento, ele desiste e o navegador mostra "conexão não segura" com o certificado padrão do Traefik. Depois que o DNS resolver, reinicie **só** os containers da EGD (app e storage) para ele tentar de novo. Não reinicie o `coolify-proxy`, que atende outros projetos do VPS.
- Rotação de segredo de sessão (`BETTER_AUTH_SECRET`) invalida todas as sessões; avise os clientes.

## 14. Operação: chaves de API e 2FA

**Chaves de API** (`/admin/api`): o segredo (`egd_…`) aparece uma única vez, na criação; o banco guarda só o hash. Crie uma chave por integração, com o menor escopo possível (`cases:read` para leitura de cases, `leads:write` para enviar leads). Suspeita de vazamento: **Revogar** (vale na hora, a chave passa a receber `401`) e crie outra. O uso fica em "Último uso" e na auditoria (`lead.created` traz `apiKeyId`).

**Verificação em duas etapas:** cada pessoa ativa em **Minha conta**. Se alguém perder o aparelho *e* os códigos de recuperação, quem administra o servidor remove o 2FA da conta, dentro do container da aplicação (Coolify → Application → Terminal):

```bash
node scripts/reset-2fa.mjs pessoa@empresa.com
```

Isso apaga o segredo, desliga o 2FA, encerra as sessões da pessoa e registra `auth.2fa.reset` na auditoria. A pessoa entra só com a senha e reativa. Não há reset por e-mail, de propósito: ele recriaria o ponto fraco que o 2FA fecha.

**E-mails para a equipe:** `ADMIN_NOTIFY_EMAIL` recebe leads (site e API), solicitações novas e respostas de clientes, e comentários de clientes em entregas. Falha de SMTP não derruba nada; só aparece no log (`mail.failed`).

## 15. Automações (Fase 13)

O agendador roda **dentro do container da aplicação**: a cada minuto confere, para cada automação ligada, se o período corrente (dia ou semana, em Brasília) está devido e ainda não foi executado. O livro-razão em `job_run` (índice único por automação, período e tentativa) garante uma execução por período mesmo com reinício ou com dois containers vivos durante um deploy. Não há cron no Coolify nem worker separado.

- **Ligar em produção:** o padrão com `NODE_ENV=production` já é ligado. `JOBS_ENABLED=1` força; `JOBS_ENABLED=0` desliga (o CI usa `0` no servidor dos E2E). A tela `/admin/automacoes` diz se o agendador deste servidor está ligado e quando foi a última verificação.
- **Horários (Brasília):** expirar propostas 07:30 todo dia; resumo diário da equipe 08:00 seg–sex; relatório semanal da equipe segunda 08:15; andamento semanal para clientes segunda 09:00 (só organizações com o resumo ligado, em `/admin/organizacoes/<id>` ou pelo cliente em `/portal/conta`).
- **Servidor fora do ar no horário:** a automação roda no primeiro minuto em que o servidor voltar, desde que ainda seja o mesmo dia (ou a mesma semana). Períodos passados nunca são executados.
- **Falha (SMTP fora, por exemplo):** até 3 tentativas por período, uma por minuto; depois a automação aparece em vermelho na tela com o erro. Resolva a causa e use **Enviar agora**, que executa de verdade sem depender do período.
- **Prévia:** cada automação tem uma prévia que renderiza o e-mail com os dados atuais sem enviar; use antes de ligar o andamento semanal para um cliente.
- **Logs:** `scheduler.started`, `scheduler.disabled`, `job.ok` e `job.failed` (JSON) em **Application → Logs**.


## 16. Notificações (Fase 14)

Toda ação relevante de uma parte vira uma notificação para a outra, no sino do topo e em `/admin/notificacoes` ou `/portal/notificacoes`. O e-mail passou a ser **por pessoa**: cada admin e cada cliente escolhe em **Minha conta → Notificações por e-mail** o que também recebe na caixa de entrada (padrão: tudo ligado).

- `ADMIN_NOTIFY_EMAIL` continua recebendo os resumos das automações e o aviso de lead do site. Avisos de solicitação e de comentário de cliente **não** vão mais para esse endereço: vão para o e-mail de cada admin ativo, conforme a preferência.
- Uma pessoa que não deve receber nada por e-mail desliga os tipos em Minha conta; para não receber nada no sistema, desative a conta.
- Retenção: a automação **Limpar notificações antigas** (03:00) apaga lidas com mais de 90 dias e não lidas com mais de 180.
- Logs: `notify.failed` (JSON) quando a gravação ou o envio falha; a action que gerou o evento não é afetada.

## 17. Solicitações: anexos, SLA, notas internas e lembretes (Fase 15)

- **Anexos:** cliente e equipe anexam até 5 arquivos (50 MB no total) por mensagem; tipos aceitos: PDF, Office, imagens, CSV, TXT e ZIP. Os arquivos ficam no mesmo storage, na organização da solicitação, e aparecem em `/admin/arquivos`.
- **Nota interna:** na resposta da equipe, a caixa "Nota interna" grava um texto que o cliente nunca vê (nem na conversa, nem na contagem, nem por e-mail). Não muda o status.
- **SLA de primeira resposta** em horas úteis (seg–sex, 9h–18h, Brasília): urgente 2 h, alta 4 h, média 8 h, baixa 16 h. Mudar a prioridade antes da primeira resposta recalcula o prazo. A lista do admin tem a aba "SLA estourado" e o painel mostra a contagem. Solicitações anteriores à Fase 15 não têm SLA (selo ausente).
- **Responsável:** definido na triagem; a aba "Minhas" filtra; quem é atribuído por outra pessoa recebe notificação.
- **Lembrete ao cliente:** automação `solicitacoes-lembrete` (seg–sex 09:30) avisa por e-mail e no portal quando a última mensagem é da equipe há 5 dias úteis ou mais; no máximo 2 lembretes, com 5 dias úteis entre eles. Prévia em `/admin/automacoes`. Nada é resolvido automaticamente.

## 18. Documento da proposta em PDF e envio por e-mail (Fase 16)

- Em `/admin/crm/propostas/<id>` o bloco **Documento** leva à página onde as seções do modelo do kit comercial são preenchidas (só em rascunho). **Gerar PDF** cria a versão seguinte (`PROP-AA-NNN-vN.pdf`), grava em Arquivos (interno) e passa a ser o anexo da proposta; **Ver PDF** mostra a prévia com o conteúdo atual sem gravar.
- **Enviar por e-mail** manda o PDF anexado ao contato da empresa escolhido; em rascunho, a proposta vira Enviada; a interação de e-mail entra na linha do tempo da oportunidade. Exige PDF (ou arquivo anexado à mão) e contato com e-mail.
- O PDF é gerado no servidor com `pdfkit` (sem navegador) e fontes padrão (Helvetica); o logo vem de `public/brand/logo-horizontal.png`. Não há variável de ambiente nova. Se a geração falhar, o log traz `proposal_pdf.*`.
