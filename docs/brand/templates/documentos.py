"""Conteúdo editorial dos modelos EGD. Campos entre colchetes são editáveis."""
def p(text): return {'type':'p','text':text}
def h(text): return {'type':'h','text':text}
def note(text): return {'type':'note','text':text}
def table(headers, rows): return {'type':'table','headers':headers,'rows':rows}
def sign(): return {'type':'sign','text':'[LOCAL], [DATA].','rows':[['CONTRATADA','CONTRATANTE'],['[REPRESENTANTE_EGD]','[REPRESENTANTE_CLIENTE]'],['[CARGO / ASSINATURA]','[CARGO / ASSINATURA]']]}
def page(title,*blocks): return {'title':title,'blocks':list(blocks)}

def documents(d):
 return [
 {'slug':'contrato-prestacao-servicos','title':'Contrato de prestação de serviços','subtitle':'Consultoria, desenvolvimento e automação','kind':'MINUTA CONTRATUAL','pages':[
 page('Partes e objeto',
 note('Modelo para contratação empresarial de serviços de tecnologia. Preencher todos os campos, adequar ao projeto e submeter à revisão jurídica antes de assinar. Não constitui documento firmado.'),
 table(['Identificação','Dados a preencher'],[
 ['Contrato / data','[NUMERO_CONTRATO] · [DATA]'],
 ['Contratada',f'{d["razao_social"]}, nome de divulgação {d["marca"]}; CNPJ {d["cnpj"]}; sede {d["endereco"]}; representante {d["representante_legal"]}.'],
 ['Contratante','[RAZAO_SOCIAL_CLIENTE]; CNPJ [CNPJ_CLIENTE]; sede [ENDERECO_CLIENTE]; representante [NOME_E_CARGO_REPRESENTANTE_CLIENTE].'],
 ['Comunicações',f'EGD: {d["email"]}. Cliente: [EMAIL_CLIENTE]. Gestores: [GESTOR_EGD] e [GESTOR_CLIENTE].']]),
 h('1. Objeto e documentos integrantes'),
 p('A CONTRATADA prestará os serviços de [DESCRICAO_DO_PROJETO], conforme entregáveis, critérios de aceite e limites definidos no Anexo I. O Anexo II disciplina o tratamento de dados pessoais quando existente. Ambos integram este contrato e deverão ser preenchidos ou identificados como não aplicáveis, com justificativa.'),
 p('A proposta [NUMERO / VERSAO / DATA] integra o ajuste apenas naquilo que estiver expressamente incorporado. Em caso de divergência, prevalecem os aditivos assinados, este contrato, o Anexo II para proteção de dados, o Anexo I para especificações técnicas e, por último, a proposta incorporada. Alterações de preço ou obrigações exigem concordância expressa das partes.'),
 h('2. Vigência e início'),
 p('A vigência será de [DATA_INICIAL] a [DATA_FINAL]. O início da execução depende de [CONDICOES_DE_INICIO], incluindo a disponibilização dos acessos e insumos previstos. Prorrogação, renovação ou manutenção recorrente dependerão de instrumento escrito. O cronograma do Anexo I identifica marcos, dependências e responsáveis.')
 ),
 page('Execução e condições comerciais',
 h('3. Responsabilidades e acompanhamento'),
 p('A CONTRATADA executará o escopo com diligência técnica, manterá o cliente informado sobre riscos e impedimentos, documentará as entregas e limitará o acesso às informações ao pessoal necessário. Subcontratações observarão o Anexo II e não afastarão sua responsabilidade pelas obrigações assumidas.'),
 p('A CONTRATANTE fornecerá informações, licenças e acessos legitimamente disponíveis, indicará responsável pelas decisões, validará entregas e efetuará os pagamentos acordados. Credenciais deverão ser compartilhadas por canal seguro; dados de produção só serão utilizados quando necessários e autorizados.'),
 h('4. Entregas, aceite e mudanças'),
 p('Cada entrega será acompanhada de evidências vinculadas aos critérios do Anexo I. O cliente terá [PRAZO_ACEITE_DIAS_UTEIS] dias úteis para aceitar por escrito ou indicar divergências objetivas. A ausência de manifestação não constitui aceite automático. As partes registrarão o impacto de atrasos de validação no cronograma.'),
 p('Desvios do escopo serão corrigidos no prazo acordado para sua gravidade. Evoluções e novos requisitos serão estimados separadamente e só executados após aprovação escrita dos impactos em prazo, preço e critérios de aceite. Atrasos por dependências serão comunicados com proposta de replanejamento.'),
 h('5. Preço, faturamento e despesas'),
 p('Preço total ou regra de apuração: [VALOR_OU_MODELO_DE_COBRANCA], conforme parcelas do Anexo I. Faturamento: [DOCUMENTO_FISCAL / CONDICOES]. Vencimento: [PRAZO]. Meio de pagamento: [MEIO]. Tributos e retenções observarão o enquadramento aplicável, detalhado em [CONDICAO_TRIBUTARIA].'),
 p('Despesas de terceiros, deslocamentos e licenças somente serão reembolsados quando previamente autorizados, com limite e comprovação. Multa, juros, correção e reajuste, se negociados, deverão constar expressamente no Anexo I e respeitar a legislação aplicável. Valores contestados de boa-fé serão tratados pelos gestores; a parcela incontroversa permanece exigível.')
 ),
 page('Tecnologia, sigilo e dados',
 h('6. Propriedade intelectual e entrega técnica'),
 p('As partes deverão definir expressamente no Anexo I a titularidade ou licença dos entregáveis, inclusive código-fonte, documentação e artefatos. Sem estipulação válida em contrário, aplica-se o regime legal cabível, inclusive o art. 4º da Lei nº 9.609/1998 para programas de computador. A minuta não presume retenção de direitos pela EGD.'),
 p('Componentes preexistentes e de terceiros serão inventariados com suas licenças. Não se transfere a titularidade de direitos que a parte não detenha. A CONTRATADA assegurará as autorizações necessárias para o uso contratado e informará previamente restrições, custos recorrentes e obrigações de código aberto. Repositórios, credenciais administrativas e documentação serão entregues nos marcos definidos.'),
 h('7. Confidencialidade'),
 p('Cada parte usará informações técnicas, comerciais e operacionais recebidas apenas para executar o contrato, com acesso restrito e dever de sigilo equivalente para colaboradores autorizados. Excluem-se informações comprovadamente públicas, já conhecidas legitimamente, recebidas licitamente de terceiro ou desenvolvidas de forma independente.'),
 p('Divulgação exigida por lei ou autoridade será limitada ao necessário e, quando permitido, comunicada previamente. O dever de sigilo vigorará durante o contrato e por [PRAZO_SIGILO] após seu término, sem afastar proteções legais que subsistam. Uso de nome, marca ou resultados como case dependerá de autorização escrita específica.'),
 h('8. Proteção de dados e segurança'),
 p('As partes observarão a LGPD e preencherão o Anexo II com finalidades, categorias de dados, papéis e instruções de tratamento. Os papéis decorrem das atividades efetivas, não apenas da denominação contratual. Dados pessoais não poderão ser reutilizados para finalidade própria ou treinamento de modelos de IA sem fundamento e autorização pertinentes.'),
 p('Serão adotados controles de acesso, minimização, proteção de credenciais e medidas adequadas ao risco. A parte que identificar incidente comunicará a outra sem demora injustificada, observando o prazo operacional do Anexo II. A comunicação entre as partes não substitui obrigações legais perante titulares ou autoridades.')
 ),
 page('Encerramento e formalização',
 h('9. Garantia, suporte e responsabilidade'),
 p('Correção de defeitos, garantia contratual e suporte seguirão os prazos, canais e limites do Anexo I, sem restringir direitos legais aplicáveis. Evoluções, novas integrações e atendimento recorrente exigem contratação expressa. Não há promessa de resultado econômico ou disponibilidade além de indicadores definidos e mensuráveis.'),
 p('Cada parte responderá por danos que lhe sejam imputáveis nos termos da legislação e do nexo causal. Eventual limite de responsabilidade somente poderá ser incluído por negociação específica e revisão jurídica, sem afastar obrigações inderrogáveis. Eventos fora do controle razoável serão comunicados com medidas de mitigação e replanejamento.'),
 h('10. Rescisão e transição'),
 p('O descumprimento será comunicado por escrito, com prazo de [PRAZO_SANEAMENTO] para regularização quando cabível. Qualquer parte poderá denunciar o contrato mediante aviso de [PRAZO_AVISO] e acerto das consequências legais e comerciais aplicáveis, inclusive em contratos por prazo determinado. A minuta não presume renúncia a indenizações previstas em lei.'),
 p('No encerramento, serão apurados serviços realizados e valores devidos, com restituição de adiantamentos sem correspondente execução quando cabível. As partes combinarão a entrega de artefatos, revogação de acessos e devolução ou eliminação de dados, respeitada a retenção legal. Sigilo e obrigações que, por natureza, subsistam permanecem aplicáveis.'),
 h('11. Comunicações e solução de divergências'),
 p('Notificações serão enviadas aos contatos identificados, com registro de recebimento. As partes buscarão solução pelos gestores antes de medidas litigiosas, sem impedir providências urgentes. Aplica-se a legislação brasileira. Foro: [COMARCA_COM_VINCULO_COM_AS_PARTES_OU_OBRIGACAO], respeitadas as regras legais de competência.'),
 p('A assinatura poderá ser física ou eletrônica, com identificação dos signatários e preservação da integridade do instrumento. Anexos e aditivos devem ser identificados pela mesma versão.'),
 sign(),
 p('Testemunhas, quando adotadas: 1. [NOME / IDENTIFICACAO / ASSINATURA] · 2. [NOME / IDENTIFICACAO / ASSINATURA].')
 ),
 page('Anexo I · Escopo e investimento',
 table(['Campo','Definição acordada'],[
 ['Projeto / versão','[PROJETO] · [VERSAO] · contrato [NUMERO]'],
 ['Objetivo','[PROBLEMA, USUARIOS E RESULTADO ESPERADO]'],
 ['Incluído / excluído','[SERVICOS INCLUIDOS] / [LIMITES E EXCLUSOES]'],
 ['Premissas / acessos','[INSUMOS, LICENCAS, RESPONSAVEIS E DEPENDENCIAS]']]),
 h('Entregáveis e marcos'),
 table(['Entrega / evidência','Critério de aceite','Prazo / responsável'],[
 ['[ENTREGA_01 / EVIDENCIA]','[CRITERIO_MENSURAVEL_01]','[DATA / RESPONSAVEL]'],
 ['[ENTREGA_02 / EVIDENCIA]','[CRITERIO_MENSURAVEL_02]','[DATA / RESPONSAVEL]'],
 ['[ENTREGA_03 / EVIDENCIA]','[CRITERIO_MENSURAVEL_03]','[DATA / RESPONSAVEL]']]),
 h('Preço e pagamento'),
 table(['Marco / parcela','Valor / cálculo','Faturamento / vencimento'],[
 ['[MARCO_01]','R$ [VALOR_01]','[CONDICAO / DATA]'],
 ['[MARCO_02]','R$ [VALOR_02]','[CONDICAO / DATA]'],
 ['Total / limite aprovado','R$ [TOTAL]','[DESPESAS / TRIBUTOS]']]),
 p('Encargos e reajuste: [MULTA / JUROS / INDICE / PERIODICIDADE OU NAO APLICAVEL]. Dependências e licenças de terceiros: [ITENS / CUSTOS / RESPONSAVEL].'),
 h('Direitos e continuidade'),
 p('Regime dos entregáveis: [CESSAO OU LICENCA / DIREITOS / PRAZO / TERRITORIO / MARCO]. Inventário de componentes preexistentes e terceiros: [ANEXO / LICENCAS]. Entrega de código, repositório e documentação: [FORMA / DATA].'),
 p('Garantia contratual: [PRAZO / COBERTURA]. Suporte: [CANAL / HORARIO / PRAZOS POR GRAVIDADE / LIMITES OU NAO CONTRATADO]. Gestores e aprovação deste anexo: [NOMES / DATA / REGISTRO].')
 ),
 page('Anexo II · Tratamento de dados',
 note('Preencher conforme o fluxo real do projeto. Se não houver tratamento de dados pessoais, registrar a justificativa e reavaliar quando o escopo mudar.'),
 table(['Dimensão','Definição acordada'],[
 ['Atividade e finalidade','[OPERACOES / FINALIDADES / SISTEMAS]'],
 ['Papéis por operação','[CONTROLADOR / OPERADOR / CONTROLADORES INDEPENDENTES, CONFORME O CASO]'],
 ['Titulares e categorias','[GRUPOS / DADOS / DADOS SENSIVEIS, SE NECESSARIOS]'],
 ['Fundamento e instruções','[BASES LEGAIS SOB RESPONSABILIDADE DE QUEM DECIDE / INSTRUCOES DOCUMENTADAS]'],
 ['Acesso e segurança','[PERFIS / AUTENTICACAO / CRIPTOGRAFIA / LOGS / BACKUP / REVISAO DE ACESSOS]'],
 ['Terceiros e localização','[SUBOPERADORES / AUTORIZACAO / HOSPEDAGEM / TRANSFERENCIA INTERNACIONAL, SE HOUVER]'],
 ['Retenção e término','[PRAZOS / DEVOLUCAO / ELIMINACAO / COMPROVACAO / EXCECOES LEGAIS]'],
 ['Incidentes','[CONTATOS / PRAZO OPERACIONAL DE AVISO / INFORMACOES MINIMAS / RESPONSAVEIS]'],
 ['Direitos e cooperação','[CANAL / RESPONSAVEL / FLUXO PARA SOLICITACOES DE TITULARES E AUTORIDADES]']]),
 h('Instruções e cooperação'),
 p('Quando atuar como operador, o prestador tratará dados conforme instruções lícitas e documentadas do controlador e comunicará instruções que entenda incompatíveis com a legislação. As partes cooperarão na apuração de incidentes e no atendimento de solicitações, preservando registros e restringindo a divulgação ao necessário.'),
 p('Suboperadores e transferências internacionais, quando existentes, devem ser identificados e observar os requisitos legais pertinentes. A contratação de nuvem ou ferramenta de IA não autoriza, por si, o compartilhamento de dados do cliente.'),
 p('Aprovação deste anexo: [REPRESENTANTES / DATA / REGISTRO].')
 )]},
 {'slug':'proposta-comercial','title':'Proposta comercial','subtitle':'Do desafio à próxima entrega','kind':'MODELO COMERCIAL','pages':[
 page('Uma solução para a sua operação',
 note('Proposta [NUMERO] · versão [VERSAO] · emissão [DATA] · válida até [DATA_VALIDADE].'),
 table(['Preparada para','Responsáveis'],[['[EMPRESA_CLIENTE]','[CONTATO_CLIENTE / CARGO]'],['[NOME_DO_PROJETO]',f'{d["nome_contato"]} · {d["cargo"]}']]),
 h('01 · Contexto'),p('[DESCREVER O CENARIO ATUAL, A ROTINA DA EQUIPE E O PROBLEMA OBSERVADO. USAR FATOS CONFIRMADOS PELO CLIENTE.]'),
 h('02 · Objetivo'),p('[DEFINIR O RESULTADO ESPERADO E COMO SERA AVALIADO, SEM PROMESSAS OU METRICAS SEM BASE.]'),
 h('03 · Abordagem'),
 table(['Etapa','O que será feito'],[['Entender','[LEVANTAMENTO / PROCESSOS / FONTES DE DADOS / CRITERIOS DE SUCESSO]'],['Conectar','[DESENHO DA SOLUCAO / INTEGRACOES / VALIDACAO TECNICA]'],['Entregar','[IMPLEMENTACAO / HOMOLOGACAO / DOCUMENTACAO / TRANSICAO]']]),
 h('Quem está ao seu lado'),p('A EGD conecta dados, sistemas e pessoas para organizar a operação. O trabalho combina consultoria, desenvolvimento e automação com escopo definido e acompanhamento das entregas.'),
 p(f'{d["email"]} · {d["telefone"]} · {d["site_curto"]}')
 ),
 page('Escopo e plano de trabalho',
 h('04 · Entregas previstas'),
 table(['Entregável','Critério de aceite','Prazo'],[['[ENTREGA_01]','[EVIDENCIA / CRITERIO_01]','[DATA_01]'],['[ENTREGA_02]','[EVIDENCIA / CRITERIO_02]','[DATA_02]'],['[ENTREGA_03]','[EVIDENCIA / CRITERIO_03]','[DATA_03]']]),
 h('05 · Premissas'),p('[LISTAR DISPONIBILIDADE DOS RESPONSAVEIS, ACESSOS, QUALIDADE DOS DADOS, LICENCAS E AMBIENTES NECESSARIOS.]'),
 h('06 · Limites do escopo'),p('[IDENTIFICAR O QUE NAO ESTA INCLUIDO: NOVAS INTEGRACOES, MIGRACAO ADICIONAL, HOSPEDAGEM, SUPORTE CONTINUO OU OUTROS ITENS RELEVANTES.]'),
 h('07 · Governança'),p('Responsáveis: [GESTOR_EGD] e [GESTOR_CLIENTE]. Reuniões: [FREQUENCIA]. Registro de decisões: [CANAL]. Validação das entregas: [PRAZO_E_FORMA]. Mudanças serão estimadas e aprovadas antes da execução.'),
 h('08 · Tecnologia e direitos'),p('Ambiente e integrações: [DESCRICAO]. Código e documentação: [FORMA_DE_ENTREGA]. Propriedade intelectual ou licença: [REGIME_A_FORMALIZAR]. Serviços de terceiros e custos recorrentes: [LISTA]. Tratamento de dados: [REQUISITOS_A_FORMALIZAR].')
 ),
 page('Investimento e próximos passos',
 h('09 · Investimento'),
 table(['Item / marco','Valor','Condição'],[['[ITEM_01]','R$ [VALOR_01]','[FATURAMENTO / VENCIMENTO]'],['[ITEM_02]','R$ [VALOR_02]','[FATURAMENTO / VENCIMENTO]'],['Total','R$ [VALOR_TOTAL]','[TRIBUTOS / RETENCOES]']]),
 p('Licenças e despesas: [INCLUIDAS / NAO INCLUIDAS / TETO]. Forma de pagamento: [FORMA]. Prazo estimado: [PRAZO], condicionado às premissas e à data de início acordada.'),
 h('10 · Continuidade'),p('Garantia e suporte: [PRAZO / ESCOPO / CANAL OU NAO CONTRATADO]. Custos posteriores: [VALOR / PERIODICIDADE OU NAO APLICAVEL]. Alterações serão formalizadas por escrito.'),
 h('11 · Aprovação comercial'),p('O aceite desta proposta registra concordância comercial e autoriza a preparação do contrato. A execução somente começará após a formalização contratual e o atendimento das condições de início. Esta proposta, por si, não autoriza acesso a sistemas ou dados.'),
 sign(),
 note('Próximos passos: validar escopo → preencher contrato e anexos → assinar → agendar início.'),
 p('Tecnologia que transforma. Soluções que geram valor.')
 )]},
 {'slug':'acordo-confidencialidade','title':'Acordo de confidencialidade','subtitle':'Proteção mútua das informações do projeto','kind':'MINUTA · ACORDO MUTUO','pages':[
 page('Finalidade e deveres de sigilo',
 note('Minuta bilateral. Preencher e revisar antes da assinatura. Referência: [NUMERO_ACORDO] · [DATA].'),
 p(f'Parte A: {d["razao_social"]}, nome de divulgação {d["marca"]}, CNPJ {d["cnpj"]}, sede {d["endereco"]}, representada por {d["representante_legal"]}.'),
 p('Parte B: [RAZAO_SOCIAL], CNPJ [CNPJ], sede [ENDERECO], representada por [NOME_E_CARGO]. Cada parte poderá atuar como reveladora ou receptora de informações.'),
 h('1. Finalidade'),p('As informações serão compartilhadas exclusivamente para [AVALIACAO / NEGOCIACAO / EXECUCAO_DO_PROJETO]. O acordo não cria obrigação de contratar, exclusividade ou licença de exploração comercial.'),
 h('2. Informações protegidas'),p('São protegidas informações não públicas de natureza técnica, comercial, financeira ou operacional compartilhadas por qualquer meio, identificadas como confidenciais ou cujo caráter reservado seja razoavelmente reconhecível pelo contexto. Incluem documentos, código, arquitetura, credenciais e dados de clientes.'),
 h('3. Obrigações recíprocas'),p('A receptora usará as informações apenas para a finalidade indicada, adotará cuidado razoável e limitará o acesso a pessoas que necessitem conhecê-las e estejam sujeitas a dever de sigilo. Não publicará nem compartilhará material com terceiros ou ferramentas de IA sem autorização pertinente.'),
 h('4. Exceções'),p('O sigilo não abrange informação comprovadamente pública sem violação deste acordo, já conhecida legitimamente, obtida licitamente de terceiro sem dever de reserva ou desenvolvida de forma independente. Divulgação legalmente exigida será limitada ao necessário, com aviso prévio quando permitido.')
 ),
 page('Prazo, devolução e assinatura',
 h('5. Vigência e permanência'),p('Este acordo vigora de [DATA_INICIAL] a [DATA_FINAL]. O dever de sigilo permanece por [PRAZO] após o encerramento, sem afastar proteção legal aplicável a segredos e dados pessoais enquanto cabível.'),
 h('6. Segurança e dados pessoais'),p('A ocorrência de acesso ou divulgação indevida será comunicada sem demora injustificada para [CONTATOS], com cooperação para contenção e apuração. O acordo não constitui autorização geral para tratamento de dados pessoais; atividades desse tipo exigem finalidade, fundamento e responsabilidades apropriados.'),
 h('7. Devolução e retenção'),p('Mediante solicitação ou término da finalidade, as informações serão devolvidas ou eliminadas no prazo de [PRAZO]. Retenções legalmente necessárias e cópias de segurança sujeitas a ciclo técnico serão identificadas, permanecerão protegidas e terão acesso restrito.'),
 h('8. Direitos e consequências'),p('Os direitos sobre o material permanecem com seus titulares. A parte responsável por violação responderá conforme a legislação e os danos demonstrados, sem prejuízo de medidas urgentes cabíveis. A minuta não fixa multa automática; eventual penalidade deverá ser expressamente negociada.'),
 h('9. Disposições finais'),p('Mudanças dependem de acordo escrito. Aplica-se a legislação brasileira. Foro: [COMARCA_COM_VINCULO], observadas as regras legais de competência. A assinatura poderá ser física ou eletrônica, preservando identificação e integridade.'),
 {'type':'sign','text':'[LOCAL], [DATA].','rows':[['PARTE A · EGD','PARTE B'],['[REPRESENTANTE / CARGO]','[REPRESENTANTE / CARGO]'],['[ASSINATURA]','[ASSINATURA]']]},
 p('Testemunhas, quando adotadas: [NOMES / IDENTIFICACAO / ASSINATURAS].')
 )]},
 {'slug':'termo-aceite','title':'Termo de entrega e aceite','subtitle':'Registro de validação dos entregáveis','kind':'MODELO OPERACIONAL','pages':[
 page('Entrega validada, continuidade definida',
 table(['Referência','Dados'],[['Contrato / projeto','[CONTRATO] · [PROJETO]'],['Cliente / responsável','[CLIENTE] · [NOME_E_CARGO]'],['Entrega / versão / data','[ENTREGA] · [VERSAO] · [DATA]'],['Ambiente / evidências','[AMBIENTE] · [LINKS_OU_ANEXOS]']]),
 h('Verificação'),table(['Critério contratado','Resultado / evidência'],[['[CRITERIO_01]','[RESULTADO_01 / EVIDENCIA]'],['[CRITERIO_02]','[RESULTADO_02 / EVIDENCIA]']]),
 h('Decisão'),p('[SELECIONAR UMA OPCAO: ACEITO / ACEITO COM RESSALVAS / NAO ACEITO]. Fundamentação: [DESCRICAO]. Pendências: [ITEM / RESPONSAVEL / PRAZO / IMPACTO]. Se não houver, registrar “sem pendências”.'),
 h('Transição'),p('Código e documentação: [LOCAL / ACESSO]. Orientação à equipe: [REGISTRO]. Início da garantia ou suporte, conforme contrato: [DATA / REFERENCIA].'),
 p('Este termo abrange somente as entregas identificadas e não altera preço, escopo ou direitos previstos no contrato. O aceite não afasta correções de defeitos ou obrigações de garantia aplicáveis.'),sign()
 )]},
 {'slug':'termo-aditivo','title':'Termo aditivo','subtitle':'Alteração controlada do contrato','kind':'MINUTA CONTRATUAL','pages':[
 page('Mudanças claras, compromisso registrado',
 note('Aditivo [NUMERO] ao contrato [NUMERO / DATA]. Preencher e revisar antes de assinar.'),
 p(f'Contratada: {d["razao_social"]}, CNPJ {d["cnpj"]}, representada por [REPRESENTANTE_EGD]. Contratante: [RAZAO_SOCIAL_CLIENTE], CNPJ [CNPJ_CLIENTE], representada por [REPRESENTANTE_CLIENTE].'),
 h('1. Alteração acordada'),table(['Item / cláusula','Nova redação ou condição'],[['Escopo / entregas','[ALTERACAO_OU_SEM_ALTERACAO]'],['Prazo / marcos','[NOVAS_DATAS_OU_SEM_ALTERACAO]'],['Preço / pagamento','[VALOR_ACRESCIMO_OU_REDUCAO / NOVO_TOTAL / PARCELAS]'],['Aceite / direitos / dados','[CRITERIOS / IMPACTOS_OU_SEM_ALTERACAO]']]),
 h('2. Vigência e anexos'),p('A alteração produz efeitos a partir de [DATA]. Documentos substituídos ou incluídos: [ANEXOS / VERSOES]. Dependências e condições de início: [DESCRICAO].'),
 h('3. Ratificação'),p('Permanecem válidas as condições do contrato não expressamente alteradas. Este aditivo prevalece apenas nos pontos que modifica e deverá ser arquivado com o instrumento original.'),sign(),
 p('Testemunhas, quando adotadas: [NOMES / IDENTIFICACAO / ASSINATURAS].')
 )]},
 {'slug':'papel-timbrado','title':'Comunicação institucional','subtitle':'Tecnologia que transforma. Soluções que geram valor.','kind':'PAPEL TIMBRADO','pages':[
 page('[ASSUNTO]',p('[LOCAL], [DATA].'),p('A [DESTINATARIO / EMPRESA]'),p('[NOME_OU_TRATAMENTO],'),p('[ESCREVA A MENSAGEM AQUI. APRESENTE O CONTEXTO, O OBJETIVO E A ACAO ESPERADA.]'),p('[INCLUA INFORMACOES COMPLEMENTARES OU REFERENCIAS, SE NECESSARIO.]'),p('Atenciosamente,'),p(f'{d["nome_contato"]}\n{d["cargo"]}\n{d["marca"]}'))
 ]}
 ]
