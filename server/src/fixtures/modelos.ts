import { Modelo } from "@models/modelo.model";

export const MODELO_REPLICA_CDC_ID = "mod_replica_cdc";
export const MODELO_PARECER_TARIFAS_ID = "mod_parecer_tarifas";
export const MODELO_DECLARACAO_CLIENTE_ID = "mod_declaracao_cliente";
export const MODELO_PETICAO_INICIAL_ID = "mod_peticao_inicial";
export const MODELO_MANIFESTACAO_INTIMACAO_ID = "mod_manifestacao_intimacao";

export const MODELOS_INICIAIS: Modelo[] = [
  {
    id: MODELO_PETICAO_INICIAL_ID,
    title: "Petição inicial — revisão de contrato bancário",
    kind: "peticao",
    area: "bancario",
    status: "ativo",
    tags: ["inicial", "cdc", "revisional"],
    body: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ____________.

[NOME DO AUTOR], [qualificação], vem, por seu advogado, propor AÇÃO REVISIONAL DE CONTRATO BANCÁRIO, com pedido de tutela de urgência, em face de [INSTITUIÇÃO FINANCEIRA], pelos fatos e fundamentos a seguir.

I — DOS FATOS
1. O autor celebrou com a ré o contrato nº [NÚMERO], em [DATA], na modalidade [TIPO].
2. A relação é de consumo. A ré é fornecedora e o autor, destinatário final do crédito.
3. O instrumento prevê [tarifas / juros / seguro / VRG] cuja legalidade deve ser confrontada com a jurisprudência do TJPR já catalogada neste caso.

II — DO DIREITO
4. Aplicam-se o CDC e a orientação das câmaras cíveis do TJPR sobre o tema deste processo.
5. Peça-se a revisão das cláusulas abusivas e a repetição do indébito na forma simples, salvo má-fé.

III — DOS PEDIDOS
a) a citação da ré;
b) a revisão das cláusulas indicadas;
c) a condenação à repetição dos valores cobrados em excesso;
d) a produção de prova documental, pericial e testemunhal.

Dá-se à causa o valor de R$ [VALOR].

[Local], [data].
[Advogado] — OAB/[UF] [número]`,
    createdAt: "2024-01-10T12:00:00.000Z",
    updatedAt: "2026-09-13T12:00:00.000Z",
  },
  {
    id: MODELO_REPLICA_CDC_ID,
    title: "Réplica — contestação em revisional bancária",
    kind: "peticao",
    area: "bancario",
    status: "ativo",
    tags: ["replica", "cdc", "contestacao"],
    body: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO.

[NOME DO AUTOR], já qualificado, vem apresentar RÉPLICA à contestação de [RÉ].

1. A ré não afastou a relação de consumo. O contrato destina-se a uso privado do autor.
2. A tese de legalidade automática das tarifas não se sustenta diante das ementas oficiais do TJPR vinculadas a este tema: cada cobrança deve ser justificada pela contraprestação efetiva.
3. Quanto à prescrição, o pedido de repetição de indébito, quando pessoal, observa o prazo do art. 205 do Código Civil, conforme a linha já reconhecida em acórdãos oficiais deste tribunal.
4. Impugna-se a prova unilateral da ré. Requer-se a exibição do contrato integral, dos extratos e da planilha de evolução da dívida.

Requer-se o julgamento antecipado se a prova documental bastar, ou a perícia contábil sobre [encargos / tarifas / VRG].

[Local], [data].
[Advogado] — OAB/[UF] [número]`,
    createdAt: "2023-01-10T12:00:00.000Z",
    updatedAt: "2026-09-13T12:00:00.000Z",
  },
  {
    id: MODELO_PARECER_TARIFAS_ID,
    title: "Parecer — tarifas e encargos no recorte do TJPR",
    kind: "parecer",
    area: "bancario",
    status: "ativo",
    tags: ["parecer", "tarifas", "tjpr"],
    body: `PARECER INTERNO — MAFINNI ADVOGADOS

Processo: [CNJ]
Tema: revisão de tarifas e encargos em contrato bancário
Destinatário: advogado responsável

1. Objeto
Avaliar, com base nas ementas oficiais do TJPR já ligadas ao caso, o que pode ser pedido com segurança e o que a câmara tende a recusar.

2. Método
Usar somente acórdãos citáveis do portal do TJPR. Não misturar decisão de outro CNJ com a deste processo sem deixar isso explícito.

3. Pontos a favor
- [trecho da ementa que reconhece restituição, CDC ou ilegalidade da tarifa]
- [trecho que afasta prescrição ou admite prova]

4. Pontos contra ou parciais
- [trecho que manteve a cobrança ou rejeitou embargos]
- [trecho de reforma só em parte]

5. Recomendação
Redigir o pedido em dois eixos: (i) o que a câmara já acolheu no recorte oficial; (ii) o que precisa de distinção fática. Anexar a ementa citável, órgão e data.

[Local], [data].
[Responsável]`,
    createdAt: "2024-02-01T12:00:00.000Z",
    updatedAt: "2026-09-13T12:00:00.000Z",
  },
  {
    id: MODELO_DECLARACAO_CLIENTE_ID,
    title: "Declaração do cliente — ciência e documentos",
    kind: "outro",
    area: "consumidor",
    status: "ativo",
    tags: ["declaracao", "cliente", "prova"],
    body: `DECLARAÇÃO

Eu, [NOME COMPLETO], [nacionalidade], [estado civil], inscrito no CPF sob o nº [CPF], declaro, para fins do processo nº [CNJ], que:

1. Contratei com [INSTITUIÇÃO] o crédito / arrendamento / financiamento identificado como [NÚMERO OU DATA].
2. Os valores cobrados a título de [tarifa / seguro / juros / VRG] não me foram explicados de forma clara no momento da contratação.
3. Entrego ao escritório cópia dos seguintes documentos: [contrato, extratos, boletos, comprovantes].
4. Estou ciente de que esta declaração integra o acervo interno do caso e destina-se ao uso profissional do advogado responsável.

Por ser verdade, firmo a presente.

[Local], [data].
________________________________
[Nome do declarante]`,
    createdAt: "2024-03-01T12:00:00.000Z",
    updatedAt: "2026-09-13T12:00:00.000Z",
  },
  {
    id: MODELO_MANIFESTACAO_INTIMACAO_ID,
    title: "Manifestação em intimação judicial",
    kind: "peticao",
    area: "civel",
    status: "ativo",
    tags: ["intimacao", "manifestacao", "prazo"],
    body: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO.

[NOME], já qualificado nos autos do processo nº [CNJ], vem, no prazo da intimação de [DATA], MANIFESTAR-SE.

1. Ciência. O signatário toma ciência do despacho / da decisão de [DATA].
2. Esclarecimento. [Responder objetivamente o que o juízo perguntou, com remissão a folhas e a ementas oficiais do TJPR quando o ponto for de direito.]
3. Documentos. Junta-se [lista]. Se algum documento não estiver disponível, indica-se o motivo e o prazo necessário para a juntada.
4. Requerimento. Requer-se o regular prosseguimento, com [produção de prova / julgamento / vista à parte contrária].

[Local], [data].
[Advogado] — OAB/[UF] [número]`,
    createdAt: "2024-04-01T12:00:00.000Z",
    updatedAt: "2026-09-13T12:00:00.000Z",
  },
];
