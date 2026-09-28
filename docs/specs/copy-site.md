# Copy do site EGD — Fase 1

Textos finais do site público, das páginas de autenticação e dos shells dos portais. Tom: engenheiro falando com engenheiro ou gestor de contrato. Frases curtas, verbos concretos, números só os medidos. Sem superlativos.

Itens marcados **[confirmar]** dependem de validação do Eugênio.

## Marca

- Nome: **EGD Consultoria & Tecnologia**. Logo em texto: "EGD" com o ponto de cota. Nos portais, só "EGD".
- Descrição de uma linha (meta description, rodapé): "Sistemas de gestão, apps de campo e automação de relatórios para consórcios de engenharia, habitação e energia."
- Domínio: egdsystem.com.br. E-mail: contato@egdsystem.com.br **[confirmar]**.

## Navegação

Início · Serviços · Produtos · Cases · Sobre · Contato. Botão: "Falar com a EGD". Link discreto: "Entrar".

## Início

**Hero**

Título: Sistemas e automação para quem gerencia obras, contratos e habitação.

Lead: Construímos sistemas de gestão documental, aplicativos de campo e relatórios automáticos para consórcios de engenharia, habitação e energia. Cada projeto entra em produção com custo e economia registrados em planilha.

Botões: "Conversar sobre um projeto" (primário) · "Ver os cases" (secundário)

Folha de projeto (card do hero, conteúdo real):
- Título da folha: Fluxo de dados de um consórcio de habitação
- Blocos do diagrama: Campo (app de vistoria) → SIGD (documentos e processos) → Relatórios automáticos → Painel Power BI
- Carimbo: Projeto: SIGD + sistema de campo · Cliente: Consórcio URBHIS · Folha: 1/1 · Rev.: 03 · Status: Em produção

**Cotas (números medidos)**
- 13 clientes atendidos
- 27 sistemas em produção
- 62 automações entregues
- R$ 1,03 milhão por ano em economia medida

Nota de rodapé das cotas: Economia = horas/mês eliminadas × custo do responsável × 12, conforme planilha de CAPEX de cada cliente.

**Serviços (seção)**

Título: O que entregamos
Lead: Seis frentes que funcionam sozinhas ou combinadas. Em todas, o código, os dados e os acessos ficam com você.

1. **Desenvolvimento de sistemas** — Sistemas web e aplicativos sob medida: gestão documental, controle de processos, cadastros de campo. Do primeiro protótipo ao uso diário da equipe.
2. **Automação de processos** — Relatórios, aprovações e integrações que hoje dependem de alguém copiar e colar. Power Automate, n8n e scripts em Python.
3. **Dados e painéis** — Modelagem, carga e painéis em Power BI que a diretoria abre toda semana. Todos os painéis leem da mesma base.
4. **Agentes de IA** — Assistentes que leem seus documentos e respondem com a fonte. Implantados dentro do seu ambiente, com registro de cada resposta.
5. **Governança de dados** — Quem acessa o quê, de onde veio cada número e como ele é validado. Inclui adequação à LGPD.
6. **Gestão de projetos de tecnologia** — Levantamento, priorização e acompanhamento de entregas com o cliente na mesa. Cadência quinzenal, escopo escrito.

Link: "Ver todos os serviços"

**Produtos (seção)**

Título: Produtos prontos para implantar
Lead: Sistemas que já rodam em clientes. Adaptamos ao seu contrato em semanas.

1. **SIGD — Gestão documental e de processos** — Documentos, revisões, fluxos de aprovação e trilha de auditoria. Em produção em cinco consórcios.
2. **Sistema de campo — Vistorias e fiscalização** — Checklists, fotos com localização e assinatura. Funciona sem sinal e sincroniza depois.
3. **Gestão de contratos** — Vigência, aditivos, alertas de vencimento e indicadores por contrato.
4. **Central de chamados** — Abertura, prazo e histórico de atendimentos, com base de conhecimento.

Link: "Ver os produtos"

**Cases (seção curta)**

Título: Onde já está rodando
Lead: Consórcios de habitação e engenharia, operações de energia e regularização fundiária. Detalhes, custos e economia de cada projeto na página de cases.

Três destaques (nome, setor, economia/ano):
- Consórcio BJMM — Habitação e engenharia — R$ 459 mil/ano
- Consórcio HABITA GERENCIAL — Habitação social — R$ 228 mil/ano
- Consórcio URBHIS — Urbanismo e habitação — R$ 200 mil/ano

Link: "Ver todos os cases"

**Chamada final**

Título: Conte qual processo hoje toma mais tempo da sua equipe.
Texto: Respondemos em até um dia útil com uma leitura inicial e os próximos passos.
Botão: "Falar com a EGD" · Texto ao lado: contato@egdsystem.com.br

## Serviços (página)

Título: Do sistema ao painel, com a mesma equipe.
Lead: Seis frentes de trabalho. Cada uma tem escopo, prazo típico e a stack que usamos de fato.

Para cada serviço, o bloco completo:

### Desenvolvimento de sistemas
Lead: Sistemas web e aplicativos que substituem planilhas compartilhadas e formulários em papel.
O que fazemos:
- Sistemas de gestão documental e de processos (SIGD, GED)
- Aplicativos de campo com uso sem sinal e sincronização
- Cadastros e fluxos de aprovação com alçadas
- Integração com ERP, SharePoint e e-mail
- Modernização de sistemas antigos por etapas
Stack: Power Apps, SharePoint, Supabase e Postgres, Next.js, Python, React Native
Prazo típico: primeira versão em uso em 4 a 8 semanas

### Automação de processos
Lead: Relatórios e rotinas que hoje alguém monta à mão passam a rodar sozinhos, com registro do que foi feito.
O que fazemos:
- Mapeamento do processo e cálculo da economia esperada
- Relatórios periódicos gerados e enviados automaticamente
- Aprovações e notificações sobre Microsoft 365
- Integrações entre sistemas por API e webhooks
- Automação de telas quando não existe API
Stack: Power Automate, n8n, Python, Azure Functions, AWS Lambda
Prazo típico: primeiros fluxos em 2 a 3 semanas

### Dados e painéis
Lead: Uma base só para os números e painéis que a gestão consulta toda semana.
O que fazemos:
- Modelagem de dados e camada semântica
- Cargas automáticas a partir de sistemas, planilhas e APIs
- Painéis em Power BI por contrato, obra ou região
- Indicadores com definição escrita e dono
- Mapas e séries históricas
Stack: Power BI, Postgres, Python, Azure Data Factory, SQL
Prazo típico: primeiro painel em 3 a 5 semanas

### Agentes de IA
Lead: Assistentes que consultam seus documentos e sistemas e respondem citando a fonte.
O que fazemos:
- Busca e resposta sobre documentos internos (RAG)
- Assistentes dentro dos seus sistemas e do Teams
- Classificação e roteamento automático de solicitações
- Avaliação de qualidade e registro de cada interação
- Modelos hospedados no seu ambiente quando o dado exige
Stack: Azure OpenAI, AWS Bedrock, pgvector, Python
Prazo típico: prova de conceito em 2 a 4 semanas

### Governança de dados
Lead: Regras claras sobre acesso, origem e qualidade de cada informação.
O que fazemos:
- Catálogo de dados com dono e definição
- Testes de qualidade nas cargas
- Linhagem: de onde vem cada número do painel
- Adequação à LGPD: acesso, retenção e anonimização
- Controle de acesso por papel e por contrato
Stack: Microsoft Purview, dbt, Great Expectations, Postgres
Prazo típico: diagnóstico em 2 semanas

### Gestão de projetos de tecnologia
Lead: Levantamento, priorização e acompanhamento das entregas, com o cliente decidindo o que vem primeiro.
O que fazemos:
- Levantamento de processos e dores com quem opera
- Backlog priorizado por economia e urgência
- Reuniões quinzenais de acompanhamento com registro
- Escopo e critérios de aceite por escrito
- Indicadores de entrega e de uso
Stack: Planner, Jira, Notion, planilha de CAPEX
Prazo típico: início em 2 semanas

Chamada final: Qual dessas frentes resolve o problema de hoje? · Botão "Falar com a EGD" · Secundário "Ver produtos prontos"

## Produtos (página)

Título: Sistemas que já rodam em clientes.
Lead: Quatro produtos adaptáveis ao seu contrato. Implantação em semanas, dados e código com você.

### SIGD — Gestão documental e de processos
Em produção em cinco consórcios.
Lead: Documentos, revisões, fluxos de aprovação e trilha de auditoria de tudo que entra e sai de um contrato.
Funções:
- Controle de revisões e versões com histórico
- Fluxos de aprovação com prazos e alçadas
- Busca por metadados e conteúdo
- Trilha de auditoria de acesso e alteração
- Integração com SharePoint e e-mail
Implantação: 3 a 6 semanas · Áreas: engenharia, gerenciamento, jurídico · Stack: Power Apps, SharePoint, Power Automate, Power BI

### Sistema de campo — Vistorias e fiscalização
Lead: Aplicativo para inspeções em campo com checklists, fotos com localização, assinatura e relatório automático.
Funções:
- Checklists por tipo de obra ou ativo
- Fotos com localização e horário
- Uso sem sinal com sincronização automática
- Relatório em PDF gerado e enviado ao fim da vistoria
- Painel com mapa de não conformidades
Implantação: 4 a 6 semanas · Áreas: engenharia, fiscalização, manutenção · Stack: Power Apps, Supabase, React Native, Power BI

### Gestão de contratos
Lead: Vigência, aditivos, alertas de vencimento e indicadores de cada contrato em um lugar só.
Funções:
- Aprovação em níveis com alçadas
- Alertas de vencimento e reajuste em 90, 60 e 30 dias
- Repositório central com versões
- Painel de obrigações e prazos
- Integração com ERP e diretório corporativo
Implantação: 2 a 4 semanas · Áreas: jurídico, suprimentos, financeiro · Stack: SharePoint, Power Apps, Power Automate, Power BI

### Central de chamados
Lead: Abertura, prazo e histórico de atendimentos, com base de conhecimento e indicadores.
Funções:
- Abertura por e-mail, web e Teams
- Prazo por categoria e prioridade
- Base de conhecimento com busca
- Painel de atendimentos em aberto e prazos
- Classificação automática por assistente de IA
Implantação: 2 a 3 semanas · Áreas: TI, facilities, atendimento · Stack: SharePoint, Power Automate, n8n, Azure OpenAI

Chamada final: Precisa de algo que não está aqui? Construímos sob medida a partir do que já existe. · Botão "Conversar sobre o seu caso"

## Cases (página, Fase 1 em conteúdo estático)

Título: 13 clientes, 27 sistemas, 62 automações.
Lead: Cada projeto entregue tem porte, escopo, investimento e economia anual registrados. A tabela abaixo reproduz a planilha de CAPEX de cada cliente.

Destaques (3): BJMM, HABITA GERENCIAL, URBHIS, com economia, sistemas, automações e entregas principais.

Tabela completa (ordenada por economia): cliente, setor, porte, sistemas, automações, investimento, economia anual, retorno em 12 meses.
Notas: Investimento = parcela de desenvolvimento, à vista ou diluída em 12 a 24 meses. Economia = horas/mês eliminadas × custo do responsável × 12.

Aviso: Publicamos novos cases aqui conforme concluímos projetos.

## Sobre

Título: Engenharia que entrega código em produção.
Lead: A EGD nasceu dentro de consórcios de engenharia e habitação, resolvendo controle de documentos, vistorias e relatórios que consumiam a equipe. Continuamos fazendo isso, agora também com dados, painéis e IA.

Números (cotas): 13 clientes · 27 sistemas · 62 automações · 7 setores **[confirmar]**

Princípios:
1. **Tudo vai para produção** — Cada entrega chega ao uso diário com testes, monitoramento e manual de operação.
2. **Ferramenta pelo contexto** — Power Platform, Azure, AWS ou código aberto: escolhemos pelo que sua equipe consegue manter.
3. **Propriedade do cliente** — Código, dados e acessos ficam com você. Sem dependência escondida.
4. **Equipe pequena e sênior** — Quem levanta o problema é quem constrói e sustenta.
5. **Ciclo curto** — Entregas em semanas, com algo em uso a cada etapa.
6. **Decisão por indicador** — Escolhemos o que fazer pelo uso medido, pela economia registrada e pelo prazo cumprido.

Linha do tempo **[confirmar cada item]**:
- 2018 — Início, com automação Microsoft e painéis para engenharia
- 2020 — Primeiro sistema de gestão documental (SIGD) em consórcio de habitação
- 2022 — Sistemas de campo com uso sem sinal para vistorias
- 2024 — Primeiros assistentes de IA sobre documentos de contrato
- 2026 — 13 clientes e 27 sistemas em produção

Setores: Habitação e engenharia · Urbanismo · Petróleo e gás · Energia · Regularização fundiária · Habitação pública · Notificações e compliance

Chamada final: Em 30 minutos de conversa dá para saber se faz sentido trabalharmos juntos. · Botão "Falar com a EGD"

## Contato

Título: Conte o problema. Respondemos em um dia útil.
Lead: Quanto mais contexto, melhor a resposta. Se preferir, escreva direto para contato@egdsystem.com.br.

Formulário:
- Nome
- E-mail
- Empresa (opcional)
- Telefone (opcional)
- Mensagem — placeholder: "Qual processo, quem faz hoje, quanto tempo leva e o que você espera."
- Botão: "Enviar mensagem"
- Enviando: "Enviando…"
- Sucesso (título): Recebemos sua mensagem. (texto): Respondemos em até um dia útil, no e-mail informado.
- Erros: "Informe seu nome" · "E-mail inválido" · "Conte um pouco mais" · "Máximo de 4000 caracteres" · Limite: "Recebemos várias mensagens deste endereço. Tente novamente em uma hora."
- Nota abaixo do botão: Usamos seus dados só para responder a esta mensagem.

Bloco lateral:
- E-mail: contato@egdsystem.com.br — Resposta em até um dia útil.
- Atendimento: segunda a sexta, 9h às 18h (horário de Brasília).
- Onde: São Paulo **[confirmar]**. Trabalho remoto em todo o Brasil; presencial quando o projeto pede.

## Rodapé

Coluna 1: EGD Consultoria & Tecnologia. Sistemas de gestão, apps de campo e automação de relatórios para consórcios de engenharia, habitação e energia.
Coluna 2 (Serviços): Desenvolvimento de sistemas · Automação de processos · Dados e painéis · Agentes de IA · Governança de dados · Gestão de projetos
Coluna 3 (Empresa): Produtos · Cases · Sobre · Contato · Entrar no portal
Coluna 4 (Contato): contato@egdsystem.com.br · São Paulo, Brasil **[confirmar]** · LinkedIn **[confirmar URL]**
Linha final: © 2026 EGD Consultoria & Tecnologia · CNPJ **[confirmar]** · Política de privacidade

## Autenticação

**Entrar**
- Título: Entrar no portal
- Campos: E-mail · Senha
- Botão: Entrar · Carregando: Entrando…
- Link: Esqueci minha senha
- Erro credencial: E-mail ou senha incorretos.
- Erro limite: Muitas tentativas. Aguarde 15 minutos.
- Rodapé: Acesso por convite. Se você é cliente e ainda não tem acesso, fale com a EGD.

**Convite**
- Título: Crie sua senha para acessar o portal da {organização}
- Texto: Você foi convidado por {e-mail do convite}. Defina um nome de exibição e uma senha.
- Campos: Seu nome · Senha (dica: mínimo 10 caracteres; evite senhas usadas em outros serviços)
- Botão: Criar minha conta
- Convite inválido: Este convite não é válido ou já expirou. · Peça um novo convite para a EGD. · Link "Ir para a página inicial"
- Usuário já existente: Você já tem conta com este e-mail. · Botão: Vincular à {organização} · Depois: "Organização vinculada. Entre com sua senha."

**Recuperar senha**
- Título: Recuperar senha
- Texto: Informe o e-mail da sua conta. Se ele existir, enviamos um link válido por 1 hora.
- Botão: Enviar link
- Confirmação: Se o e-mail existir, enviamos um link válido por 1 hora. Verifique também a caixa de spam.

**Redefinir senha**
- Título: Definir nova senha
- Campos: Nova senha · Confirmar nova senha
- Botão: Salvar nova senha
- Link inválido: Este link não é mais válido. · Botão "Pedir um novo link"
- Sucesso (na tela de entrar): Senha redefinida. Entre com a nova senha.

## Portal administrativo (shell)

Menu: Painel · Organizações · Leads · Arquivos · Auditoria
Topo: nome do usuário, menu: Minha conta · Sair

Painel: título "Painel" · cartões: "Leads novos" (número) · "Organizações" (número) · lista "Últimos leads".
Organizações: título "Organizações" · botão "Nova organização" · tabela: Nome · Identificador · Status · Criada em · vazio: "Nenhuma organização ainda. Crie a primeira para convidar clientes."
Nova organização: campos Nome · CNPJ (opcional) · Identificador (opcional, gerado do nome) · Botão "Salvar" · erro slug: "Identificador em uso".
Detalhe da organização: nome + status · botão "Inativar" / "Reativar" (confirmação: "Inativar {nome}? Os usuários dela perdem acesso ao portal até ser reativada.") · seção "Usuários" (Nome · E-mail · Status · ação Desativar/Ativar) · seção "Convites pendentes" (E-mail · Expira em · ação Reenviar) · formulário "Convidar por e-mail" com campo E-mail e botão "Convidar" · vazio: "Nenhum usuário. Convide o primeiro pelo e-mail."
Leads: título "Leads" · filtro: Novos · Vistos · Todos · tabela: Nome · E-mail · Empresa · Mensagem · Recebido em · ação "Marcar como visto" · vazio: "Nenhum lead recebido pelo site ainda."
Arquivos: título "Arquivos" · formulário: Arquivo · Organização (opcional, "Interno") · botão "Enviar" · tabela: Nome · Tamanho · Organização · Enviado em · ação "Baixar" · vazio: "Nenhum arquivo enviado."
Auditoria: título "Auditoria" · tabela: Quando · Ação · Entidade · Quem · Organização · Detalhes.

## Portal do cliente (shell)

Menu: Início · Minha conta
Topo: seletor de organização (quando houver mais de uma) · nome do usuário · Sair

Início: "Olá, {nome}." · "Você está no portal da {organização}." · cartão: "Em breve neste portal" — "Acompanhamento dos projetos, abertura de solicitações e download dos documentos entregues. Estamos preparando essas áreas." · cartão "Precisa de algo agora?" — "Escreva para contato@egdsystem.com.br. Respondemos em até um dia útil."
Minha conta: "Minha conta" · bloco "Nome de exibição" (campo + Salvar) · bloco "Senha" (Senha atual · Nova senha · Salvar nova senha) · sucesso: "Nome atualizado." / "Senha alterada. As outras sessões foram encerradas."
Sem acesso: "Sua conta não está vinculada a nenhuma organização ativa." · "Fale com a EGD para regularizar o acesso." · Botão "Sair"

## Erros e páginas de sistema

- 404 (site): Página não encontrada. · Verifique o endereço ou volte ao início. · Botão "Ir para o início"
- Erro (site/portais): Algo deu errado. · Já registramos o problema. Se precisar de ajuda, informe o código {digest}. · Botão "Tentar de novo"
- 404 (admin visto por cliente): idêntico ao 404 do site, sem menu.
