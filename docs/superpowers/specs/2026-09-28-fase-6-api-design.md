# EGD Consultoria & Tecnologia — Fase 6: API pública, chaves e webhook de entrada

**Data:** 2026-09-28
**Status:** implementada (branch `fase-6-api`, baseada em `fase-5-cases`)
**Depende de:** Fase 2 (leads/CRM) e Fase 5 (cases).

## 1. Objetivo
Permitir que sistemas externos leiam o conteúdo público e enviem leads, com chaves geridas no admin.

## 2. Decisões

| Decisão | Escolha | Descartado |
|---------|---------|------------|
| Autenticação | `Authorization: Bearer egd_<43 chars>`. 256 bits de entropia, gerada no servidor. | OAuth (over-engineering para integrações servidor-a-servidor). |
| Armazenamento | Só `sha256(chave)` + prefixo de 12 caracteres para identificação. O segredo é mostrado **uma vez**. Listagem e auditoria nunca contêm o segredo. | Guardar cifrado (permitiria revelar de novo). |
| Escopos | `cases:read`, `leads:write`. Uma chave, um ou mais escopos; escopo ausente = 403. | Papéis genéricos. |
| Revogação | `revokedAt`; efeito imediato (a consulta filtra `revokedAt is null`). | Expiração automática (fica para depois). |
| Limite | 120 req/min por chave, em memória (mesmo limiter do site). 429 com `Retry-After`. | Redis (só quando houver mais de um container). |
| Endpoints | `GET /api/v1/cases`, `GET /api/v1/cases/:slug`, `POST /api/v1/leads`. Contrato próprio em inglês, valores em centavos (`toApiCase`), independente do formato do site. | Expor o formato interno. |
| Webhook de entrada | `POST /api/v1/leads` usa a mesma validação do formulário; o lead entra com `source = "api"` e notifica por e-mail. Identifica o remetente pela chave (`ipHash` = HMAC de `api-key:<id>`). | Rota separada de webhook sem chave. |
| Erros | `{ "error": { "code", "message" } }`; 422 traz `fields` por campo. `Cache-Control: no-store`. | — |
| Auditoria | `api_key.created`, `api_key.revoked`, `lead.created` (com `apiKeyId`). | — |

## 3. Limitações conhecidas
- Limite de taxa em memória: vale por processo; com mais de um container, multiplica.
- Sem webhooks de saída (a EGD avisando terceiros); o roadmap pedia só entrada.
- Sem expiração automática de chaves nem rotação assistida.
