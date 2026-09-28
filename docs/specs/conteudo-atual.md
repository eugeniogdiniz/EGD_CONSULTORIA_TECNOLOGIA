# Inventário do conteúdo atual (site em `legacy/`)

Levantado em 2026-09-27 a partir de `legacy/assets/*.jsx`. Serve de insumo para a copy nova e para o design system. O que está marcado **[confirmar]** não pôde ser verificado e precisa de validação do Eugênio antes de ir ao ar.

## Identidade atual

- Nome: EGD Consultoria (logo "EGD." + "CONSULTORIA")
- Tagline: "Engenharia de dados, sistemas e automação"
- Visual: fundo #06080d, acento azul elétrico oklch(0.72 0.19 252), Space Grotesk + JetBrains Mono, terminal animado no hero, eyebrows em caixa alta com numeração ("01 / 06", "P/01"), grid de cards com ícone, tickers falsos ("12.4k events/s"), status "Operando · 99.97%".
- Tudo isso cai nas restrições do CLAUDE.md global (cara de IA). Nada da apresentação é reaproveitado.

## Páginas e conteúdo

### Início
- Hero: "Engenharia de dados, sistemas e automação que escalam." + parágrafo sobre AWS, Azure, Apache.
- Métricas: +120% retorno, 8+ anos, 40+ projetos, 99,9% SLA **[confirmar; a página de cases contradiz: 13 clientes]**.
- Seis serviços (ver abaixo), diagrama de arquitetura Kafka/Spark/Iceberg **[stack não aparece em nenhum case real]**, quatro produtos, stack por grupo (AWS, Azure, Apache, Power Platform), CTA final com e-mail contato@egdconsultoria.com.br **[confirmar; domínio novo é egdsystem.com.br]**.

### Serviços (6)
1. Desenvolvimento de Sistemas — web, mobile, APIs, modernização de legado.
2. Automação de Processos — Power Automate, n8n, serverless, RPA.
3. Data Analytics & BI — Power BI, lakehouse, Spark **[lakehouse/Spark não aparecem nos cases]**.
4. Agentes de IA — RAG, copilotos, guardrails.
5. Governança de Dados — catálogo, qualidade, LGPD.
6. Consultoria em Projetos Ágeis — discovery, DORA, OKRs.
Cada um com "delivery" (prazo) e "squad" **[squads de 2–4 devs contradizem operação solo/pequena]**.

### Produtos (4)
1. Gestão de Contratos (SharePoint, Power Apps, Power Automate, Power BI).
2. Gestão de RH (Power Apps, MySQL, Azure Functions).
3. App de Vistorias e Fiscalização de Obras (Power Apps, Supabase, React Native) — tem correspondência direta nos cases (sistema de campo).
4. Central de Chamados / Helpdesk (SharePoint, n8n, Azure OpenAI).

### Sobre
- Princípios (6): engenharia não promessa; stack agnóstico; propriedade do cliente; time pequeno e sênior; ciclo curto; métrica acima de opinião. Bons, mantidos com texto revisado.
- Linha do tempo 2018–2026 **[confirmar datas]**; "22 pessoas no time" **[confirmar; provavelmente não]**; "6 setores".
- Setores: Indústria, Varejo, Saúde, Jurídico, Construção, Financeiro **[cases reais: habitação, engenharia, urbanismo, energia/petróleo, regularização fundiária; varejo/saúde/jurídico não aparecem]**.

### Contato
- Formulário: nome, empresa, e-mail, telefone, áreas de interesse (pills), investimento previsto (pills), mensagem. A spec da Fase 1 reduz a nome, e-mail, empresa, telefone, mensagem.
- Blocos: e-mail, telefone +55 (11) 99999-0000 **[placeholder óbvio]**, São Paulo **[confirmar]**, "Trabalhe conosco: 4 vagas" **[confirmar; provavelmente remover]**.

### Cases (dados reais, da Planilha de CAPEX)
13 clientes. Totais recalculados da própria tabela:

| Métrica | Valor |
|---|---|
| Clientes | 13 |
| Sistemas | 27 |
| Automações | 62 |
| Economia anual proposta | R$ 1.026.098 |
| CAPEX total informado | R$ 225.148 |

Top 3 em economia: Consórcio BJMM (R$ 459.483/ano), Consórcio HABITA GERENCIAL (R$ 228.004), Consórcio URBHIS (R$ 199.728). Setores reais: habitação e engenharia (consórcios), urbanismo, petróleo e gás (Macaé Petrobras), energia (Eletrobras, Cosan), notificações/compliance (Vinci), regularização fundiária (REURBSP), habitação pública (COHAB Santos).

Produtos que aparecem de fato nos cases: SIGD (gestão documental/gerenciamento), GED, sistema de vistoria/campo, apps Power Apps, relatórios automatizados, controle de frotas/KM, app Android de arrolamento, painéis Power BI.

## Decisões para a copy nova

- Falar do que existe: sistemas de gestão, apps de campo, relatórios automáticos, painéis, para consórcios de engenharia, habitação e energia.
- Números só os da tabela de cases. Nenhum "99,9% SLA", "+120%", "8+ anos" sem fonte.
- Remover: tickers, terminal, "vagas abertas", telefone placeholder, stack que não aparece em case.
- Manter os seis serviços e os quatro produtos, com descrição honesta e stack real (Power Platform, SharePoint, Power BI, Supabase/Postgres, Python, n8n, Azure, AWS quando houver).
- Lista **[confirmar]** vai junto com o mockup para o Eugênio validar.
