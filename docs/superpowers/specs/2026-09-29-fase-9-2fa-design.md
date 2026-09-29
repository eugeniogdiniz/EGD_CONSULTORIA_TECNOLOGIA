# EGD Consultoria & Tecnologia — Fase 9: Verificação em duas etapas (2FA)

**Data:** 2026-09-29
**Status:** implementada (branch `fase-9-2fa`)
**Depende de:** Fase 1 (autenticação com Better Auth).

## 1. Objetivo
Proteger o login, principalmente o do admin (o painel guarda dados de clientes), com TOTP e códigos de recuperação. Listada como "futuro" na Fase 1.

## 2. Decisões

| Decisão | Escolha | Descartado |
|---------|---------|------------|
| Mecanismo | Plugin `two-factor` do Better Auth: TOTP (RFC 6238) + 10 códigos de recuperação de uso único. Segredo e códigos ficam cifrados (`two_factors`), bloqueio por tentativas erradas embutido. | Implementar TOTP à mão; SMS/e-mail OTP (mais fracos e com custo). |
| Escopo | Opcional e por conta, para admin **e** cliente, em `/admin/conta` e `/portal/conta`. Painel do admin mostra faixa recomendando ativar. | Obrigatório agora: um único admin — perder o aparelho sem plano de recuperação trancaria o sistema. |
| Ativação | Senha atual → QR code (+ chave manual) e códigos de recuperação → confirmar com um código. Só liga depois de confirmar (`twoFactorEnabled`). Desativar e gerar novos códigos exigem a senha. | Ligar direto sem confirmação. |
| Login | Senha certa não cria sessão: a tela pede o código do app ou um de recuperação. O plugin descarta a sessão da etapa da senha. | Sessão parcial. |
| Auditoria | `auth.login` (com `mfa: true/false`) só no login completo; `auth.2fa.enabled/disabled`; `auth.2fa.reset` (script). O contador de falhas por e-mail só zera no login completo. | Registrar login já na senha (enganoso). |
| Recuperação | `npm run auth:reset-2fa -- <e-mail>`: remove o segredo, desliga o 2FA, encerra as sessões e audita. Exige acesso ao banco (é operação de quem administra o servidor). | Reset por e-mail (recriaria o ponto fraco que o 2FA fecha). |
| QR code | Biblioteca `qrcode`, gerado no navegador (o segredo não passa por terceiros). | Serviço externo de QR. |

## 3. Fora do escopo
Obrigatoriedade por papel, "confiar neste dispositivo", WebAuthn/passkeys, reset de 2FA de outro usuário pela interface.
