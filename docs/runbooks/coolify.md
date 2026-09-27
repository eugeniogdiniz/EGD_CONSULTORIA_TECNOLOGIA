# Runbook: provisionar o Coolify e publicar egdsystem.com.br

Passo a passo para colocar a Fase 1 no ar num VPS Hostinger com Coolify. Os passos de painel e DNS são do Eugênio; os comandos são para rodar no VPS via SSH ou na máquina local, conforme indicado.

Referências: spec `docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md` §7, `Dockerfile`, `.env.example`.

## 1. VPS

- Plano Hostinger com Ubuntu 24.04, mínimo 2 vCPU e 4 GB de RAM (o build do Next.js consome memória; 8 GB é mais confortável).
- Acesso SSH por chave. No VPS:

```bash
apt update && apt upgrade -y
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

## 2. Instalar o Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Ao terminar, abra `http://IP-DO-VPS:8000`, crie a conta de administrador, e em **Settings** defina o domínio do painel como `https://coolify.egdsystem.com.br` (depois do DNS do passo 3). Ative 2FA na sua conta do Coolify.

## 3. DNS (painel do domínio egdsystem.com.br)

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | `@` | IP do VPS | 300 |
| A | `www` | IP do VPS | 300 |
| A | `coolify` | IP do VPS | 300 |
| A | `storage` | IP do VPS | 300 |

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
- Portas: 9000 (API) só na rede interna; 9001 (console) com domínio `https://storage.egdsystem.com.br` para você administrar. O app fala com a API pelo endereço interno `http://egd-storage:9000`.
- O bucket `egd` é criado pelo próprio app na primeira gravação; não precisa criar à mão.

### 4.3 Aplicação

- Instale o **GitHub App do Coolify** no repositório `eugeniogdiniz/EGD_CONSULTORIA_TECNOLOGIA` (Sources → GitHub).
- **New Resource → Application → GitHub App**, repositório acima, branch `main`, **Build Pack: Dockerfile**, porta `3000`.
- Domínio: `https://egdsystem.com.br`. Em **Settings → Domains** adicione também `https://www.egdsystem.com.br` e marque redirecionamento para o apex (ou configure o redirect no proxy).
- Healthcheck: path `/api/health`, porta 3000.
- Deploy automático: ligado (webhook do GitHub em push na `main`).

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
| `S3_ENDPOINT` | `http://egd-storage:9000` |
| `S3_BUCKET` | `egd` |
| `S3_ACCESS_KEY` | mesmo valor de `RUSTFS_ACCESS_KEY` |
| `S3_SECRET_KEY` | mesmo valor de `RUSTFS_SECRET_KEY` |
| `SEED_ADMIN_EMAIL` | seu e-mail de admin (só para o passo 7; remover depois) |
| `SEED_ADMIN_PASSWORD` | senha inicial forte (só para o passo 7; remover depois) |

Se algum nome ausente ou inválido, o container sai na inicialização com a mensagem `Variáveis de ambiente inválidas` listando a chave.

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
6. Em `/admin/arquivos`, enviar um arquivo e baixar pelo link.
7. `/admin/auditoria` lista os eventos acima.

## 10. Desligar o GitHub Pages

No repositório: **Settings → Pages → Source: None**. Depois execute a Task 18 do plano (remove `legacy/` e `.github/workflows/pages.yml`).

## 11. Rollback

**Application → Deployments**: escolha um deploy anterior e clique em **Redeploy**. Migrations são aditivas na Fase 1; um rollback de app não exige rollback de banco.

## 12. Operação do dia a dia

- Logs: **Application → Logs** (o app escreve JSON, uma linha por evento; erros trazem `digest`, que é o código que a tela de erro mostra ao usuário).
- Atualizar: push na `main` dispara deploy; falha de migration mantém a versão anterior no ar.
- Rotação de segredo de sessão (`BETTER_AUTH_SECRET`) invalida todas as sessões; avise os clientes.
