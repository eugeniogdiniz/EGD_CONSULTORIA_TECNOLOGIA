# Visibilidade em buscadores e IAs: como ligar e como medir

O site já está preparado para ser lido e citado (perguntas frequentes com FAQPage, JSON-LD de
Organization, Person, Service, Product e Article, `llms.txt`, robôs de IA liberados, páginas por
produto, serviço, público e artigos). Este runbook cobre o que falta ligar fora do código e como
saber se está funcionando.

## 1. Google Search Console (grátis, obrigatório)

1. Entrar em https://search.google.com/search-console com a conta Google da EGD.
2. Adicionar propriedade do tipo **Domínio** (`egdsystem.com.br`): cobre www, http e https de uma vez.
   A verificação é por registro TXT no DNS do domínio.
   Alternativa sem DNS: propriedade **Prefixo de URL** (`https://egdsystem.com.br`) e verificação por
   **Tag HTML**: copiar só o `content` da meta tag e colocar em `GOOGLE_SITE_VERIFICATION` no Coolify.
   O site publica `<meta name="google-site-verification">` sozinho no próximo deploy.
3. Em **Sitemaps**, enviar `https://egdsystem.com.br/sitemap.xml`.
4. Em **Inspeção de URL**, pedir indexação das páginas mais importantes (home, `/consorcios`,
   `/para/construtoras`, `/para/incorporadoras`, `/para/empresas-de-engenharia`, artigos).

O que olhar, toda semana, em **Desempenho**: impressões e cliques por consulta e por página.
Consultas alvo: "software para consórcio de engenharia", "app de vistoria de obras", "RDO digital",
"medição de contrato de obra", "controle de documentos consórcio", "fiscalização de obras app".

## 2. Bing Webmaster Tools (grátis; alimenta ChatGPT, Copilot e DuckDuckGo)

1. Entrar em https://www.bing.com/webmasters e **importar do Google Search Console** (um clique,
   aproveita a verificação) ou verificar por meta tag: copiar o `content` de `msvalidate.01` para
   `BING_SITE_VERIFICATION` no Coolify.
2. Enviar o mesmo sitemap.
3. Ligar o **IndexNow** (seção 3): o Bing passa a saber de páginas novas na hora.

## 3. IndexNow (avisa o Bing a cada publicação)

1. Gerar uma chave: `openssl rand -hex 16` (32 caracteres).
2. Colocar em `INDEXNOW_KEY` no Coolify (e no `.env` local) e fazer o deploy. O site passa a servir
   `https://egdsystem.com.br/indexnow/<chave>.txt` com a própria chave (é assim que o Bing confere).
3. Depois de cada deploy que publique página nova ou texto revisado, rodar localmente:

   ```
   npm run seo:indexnow
   ```

   O script lê o sitemap de produção, confere que a chave está publicada e envia todas as URLs.
   Resposta `200` ou `202` é sucesso.

## 4. Os robôs de IA estão lendo o site?

Cada acesso de robô de busca ou de IA ao site público vira uma linha JSON no log do container,
com `msg: "robo_ia"`, o nome do robô e o caminho. No Coolify, em **Logs** do app, filtrar por
`robo_ia`. Para contar por robô na última semana a partir de um arquivo de log:

```
grep robo_ia app.log | jq -r .bot | sort | uniq -c | sort -rn
grep robo_ia app.log | jq -r .path | sort | uniq -c | sort -rn | head -20
```

O que esperar: `Googlebot` e `Bingbot` em dias; `GPTBot`, `ClaudeBot` e `PerplexityBot` em
semanas, normalmente começando por `/llms.txt`, `/robots.txt` e a home. Se depois de um mês não
aparecer nenhum robô de IA, conferir se o `robots.txt` em produção ainda lista os robôs
(`curl https://egdsystem.com.br/robots.txt`).

## 5. Teste manual mensal (15 minutos)

Anotar numa planilha, com data:

1. **Google em janela anônima**, para cada consulta alvo da seção 1: posição da EGD (ou "não aparece")
   e se aparece uma AI Overview citando o site.
2. **ChatGPT, Perplexity, Gemini e Claude**, as mesmas três perguntas:
   - "Existe software específico para consórcio de engenharia no Brasil?"
   - "Que empresa faz app de vistoria de obras com relatório em PDF automático?"
   - "Como montar o boletim de medição de um contrato de obra?" (o artigo deve ser citado)
   Registrar se a EGD é citada e com qual link.
3. **Validar os dados estruturados** de uma página nova: https://validator.schema.org e
   https://search.google.com/test/rich-results com a URL de produção.

## 6. Prazos realistas

- Indexação de página nova: 1 a 4 semanas (dias, com IndexNow no Bing).
- Movimento de posição no Google: 2 a 3 meses.
- Citação por IA: depende de a entidade "EGD" existir fora do site (seção 7).

## 7. O que depende do dono (a entidade EGD fora do site)

Buscadores e IAs confiam mais em quem aparece em mais de um lugar com os mesmos dados. Na ordem:

1. **Perfil da empresa no Google** (Google Business Profile): nome, categoria "Consultoria de TI",
   endereço ou área de atendimento, site, telefone, horário. Depois de criado, colocar a URL pública
   do perfil em `SITE.profiles` (`src/content/site.ts`): entra no `sameAs` da Organization e no
   `llms.txt`.
2. **Página da empresa no LinkedIn** com a mesma descrição da home; idem em `SITE.profiles`.
   Republicar lá cada artigo do site, com link para o original.
3. **Telefone e WhatsApp** publicados no site e no perfil do Google (hoje só há e-mail).
4. **Depoimentos** com nome, cargo e empresa, e os cases (hoje ocultos, `SHOW_CASES = false`).
5. **Rodapé legal**: razão social, CNPJ, política de privacidade. Os dados estão como placeholder
   em `docs/brand/templates/dados-comerciais.json`.
