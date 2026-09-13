import { aplicarPoliticaAntiAlucinacao } from "./politica-caso";
import { hidratarPrazos } from "./prazos-escritorio";
import { Caso, Documento, MembroEquipe, Prazo } from "./tipos";

function doc(
  id: string,
  titulo: string,
  tipo: string,
  data: string,
  origem: string,
  resumo: string
): Documento {
  return { id, titulo, tipo, data, origem, resumo };
}

export const ESCRITORIO = {
  nome: "Vilela & Prado",
  usuario: "Gustavo Vilela",
  papel: "Advogado",
  iniciais: "GV",
};

/** Quem pode ser marcado com @ nos canais dos casos. */
export const EQUIPE: MembroEquipe[] = [
  { id: "ana", nome: "Ana Prado", papel: "Sócia", iniciais: "AP" },
  { id: "marina", nome: "Marina Costa", papel: "Advogada", iniciais: "MC" },
  { id: "joao", nome: "João Lima", papel: "Estagiário", iniciais: "JL" },
];

const CASOS_BRUTOS: Array<Omit<Caso, "prazos"> & { prazos?: Prazo[] }> = [
  {
    id: "tarifas",
    titulo: "Revisão de juros e tarifas",
    tema: "cédula de crédito bancário · CDC · tarifas sem contraprestação",
    subtema: "Tarifas",
    processNumber: "9000032-85.2024.8.16.0001",
    court: "TJPR",
    chamber: "13ª Câmara Cível",
    status: "ATIVO",
    cliente: "Maria Clara Souza",
    partes: [
      { papel: "Autora", nome: "Maria Clara Souza" },
      { papel: "Réu", nome: "Banco Horizonte S.A." },
    ],
    resumo:
      "Revisão de cédula de crédito com juros e tarifas que a cliente alega não terem sido informados de forma clara.",
    tese: "Aplicação do CDC e nulidade de tarifas sem contraprestação efetiva.",
    atualizacao: "Contestação juntada ontem",
    chance: 72,
    chanceRotulo: "Tendência favorável",
    chanceTexto:
      "A 13ª Câmara tem acolhido revisão quando a prova do contrato é incompleta. O risco está na 15ª, mais restritiva.",
    votos: { for: 18, against: 7, diverge: 5 },
    peticoes: [
      doc("p1", "Petição inicial", "Peça", "12/03/2024", "Acervo interno", "Revisão da cédula, repetição do indébito e pedido de exibição do contrato integral."),
      doc("p2", "Emenda à inicial", "Peça", "27/03/2024", "Acervo interno", "Ajuste do valor da causa após planilha de recálculo das tarifas."),
      doc("p3", "Réplica à contestação", "Peça", "02/06/2024", "Acervo interno", "Resposta à alegação de que o CDC não incidiria sobre a cédula de crédito."),
      doc("p4", "Manifestação sobre documentos", "Peça", "19/07/2024", "Acervo interno", "Impugnação do contrato juntado pelo banco: página das tarifas ilegível."),
      doc("p5", "Alegações finais", "Peça", "05/09/2026", "Acervo interno", "Fecha a tese em três pontos: informação, contraprestação e devolução."),
    ],
    contratos: [
      doc("c1", "Cédula de crédito bancário nº 88.421", "Contrato", "08/01/2023", "Cliente", "Instrumento original com tarifa de cadastro e tarifa de avaliação de bem."),
      doc("c2", "Termo de adesão a seguro prestamista", "Contrato", "08/01/2023", "Cliente", "Seguro embutido na operação, sem assinatura separada."),
      doc("c3", "Aditivo de renegociação", "Contrato", "14/11/2023", "Cliente", "Repactuação do saldo com nova cobrança de tarifa de cadastro."),
    ],
    documentos: [
      doc("d1", "Extratos da conta 2023–2024", "Cliente", "20/03/2024", "Cliente", "Série completa dos lançamentos usados no recálculo."),
      doc("d2", "Procuração e documentos pessoais", "Cliente", "10/03/2024", "Cliente", "Qualificação da autora e comprovante de residência."),
      doc("d3", "Planilha de recálculo", "Trabalho interno", "25/03/2024", "Equipe", "Comparativo entre o valor cobrado e o devido sem as tarifas."),
      doc("d4", "Áudio da consulta inicial", "Cliente", "05/03/2024", "Cliente", "Transcrição em que a cliente relata não ter sido informada das tarifas."),
      doc("d5", "Comprovantes de pagamento das parcelas", "Cliente", "20/03/2024", "Cliente", "28 parcelas quitadas, base do pedido de repetição."),
    ],
    decisoes: [
      doc("de1", "Decisão saneadora", "Decisão", "18/04/2024", "TJPR", "Determinou ao banco a juntada do contrato integral e legível."),
      doc("de2", "Decisão sobre prova", "Decisão", "30/08/2024", "TJPR", "Deferiu perícia contábil limitada às tarifas discutidas."),
      doc("de3", "Despacho de alegações finais", "Despacho", "28/08/2026", "TJPR", "Prazo comum de 15 dias antes da sentença."),
    ],
    modelos: [
      doc("m1", "Modelo de réplica — CDC bancário", "Modelo", "2023", "Biblioteca", "Estrutura já usada em 6 casos semelhantes deste escritório."),
      doc("m2", "Parecer interno sobre tarifas", "Parecer", "2024", "Biblioteca", "Mapa do que o TJPR aceita e rejeita em cada câmara."),
      doc("m3", "Checklist de prova em revisional", "Modelo", "2024", "Biblioteca", "O que pedir ao cliente antes de protocolar."),
      doc("m4", "Modelo de planilha de recálculo", "Modelo", "2022", "Biblioteca", "Base de cálculo aceita pela perícia em dois casos."),
    ],
    historico: [
      { data: "11/09/2026", titulo: "Contestação", detalhe: "Banco impugnou a aplicação do CDC e defendeu a legalidade das tarifas." },
      { data: "30/08/2024", titulo: "Perícia deferida", detalhe: "Limitada às tarifas de cadastro e avaliação." },
      { data: "18/04/2024", titulo: "Despacho", detalhe: "Prazo para o réu juntar o contrato integral." },
      { data: "12/03/2024", titulo: "Distribuição", detalhe: "13ª Câmara Cível do TJPR." },
    ],
    teses: [
      { id: "t1", titulo: "CDC aplicável à cédula bancária", uso: "Base da inicial e da réplica.", forca: "alta" },
      { id: "t2", titulo: "Tarifa sem serviço comprovado", uso: "Pedido de repetição do indébito.", forca: "alta" },
      { id: "t3", titulo: "Capitalização não pactuada de forma clara", uso: "Pedido subsidiário.", forca: "media" },
      { id: "t4", titulo: "Venda casada do prestamista", uso: "Reforço no dano material.", forca: "media" },
    ],
    resultados: [
      { id: "r1", titulo: "Caso Nogueira · 2023", desfecho: "Acordo com redução de 38% do saldo.", aprendizado: "A proposta só veio depois da perícia contábil ser deferida." },
      { id: "r2", titulo: "Caso Bertoldo · 2022", desfecho: "Sentença favorável nas tarifas, juros mantidos.", aprendizado: "Pedir tarifa e juros juntos enfraquece o foco; separe os capítulos." },
    ],
    conversas: [
      { id: "cv1", autora: "Ana Prado", papel: "Sócia", hora: "09:12", texto: "Vamos cravar o CDC logo na preliminar. Eles vão tentar afastar." },
      { id: "cv2", autora: "João Lima", papel: "Estagiário", hora: "09:40", texto: "@Ana Prado separei três acórdãos da 13ª com a mesma relatora." },
      { id: "cv3", autora: "Memória", papel: "IA do caso", hora: "09:41", texto: "Há 4 peças internas com tese idêntica. A mais próxima é a réplica do caso Nogueira, 2023.", ia: true },
      { id: "cv4", autora: "Marina Costa", papel: "Advogada", hora: "10:05", texto: "A página das tarifas do contrato veio ilegível. Já impugnei." },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000055-05.2022.8.16.0000",
        acordao: "Acórdão 214.881",
        court: "TJPR",
        chamber: "13ª Câmara Cível",
        reporter: "Des. Helena Vargas",
        date: "14/08/2023",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "for",
        ementa: "Tarifas cobradas sem comprovação de serviço. CDC aplicável. Repetição devida.",
        pontos: ["CDC reconhecido", "Ônus da prova do banco", "Repetição simples"],
        essencial: {
          resumo:
            "A Câmara partiu de um ponto simples: quem cobra tarifa tem que mostrar o serviço que ela paga. O banco juntou o contrato, mas não demonstrou nenhuma atividade concreta ligada à tarifa de avaliação do bem. Com isso, a relação foi tratada como de consumo, o ônus foi invertido e a devolução veio na forma simples, sem dobra.",
          itens: [
            "Voto: a instituição não comprovou a contraprestação da tarifa de avaliação.",
            "Inversão do ônus quando a alegação do consumidor é verossímil.",
            "Devolução simples, porque não se reconheceu má-fé na cobrança.",
          ],
        },
        fortalecer: {
          resumo:
            "O que fez esse acórdão andar foi prova documental, não retórica. Coloque o contrato incompleto como peça central da sua argumentação e peça expressamente que o banco demonstre qual serviço a tarifa remunera. Enquanto ele não fizer isso, a discussão fica no seu campo — e é justamente aí que essa Câmara decide a favor do consumidor.",
          itens: [
            "Anexe o contrato incompleto e aponte, por página, o que falta.",
            "Peça em tópico separado a prova da contraprestação de cada tarifa.",
            "Cite este acórdão junto com a planilha de recálculo, não sozinho.",
          ],
        },
        blindar: {
          resumo:
            "O flanco aberto aqui é o banco aparecer depois com o contrato integral e legível, tentando mostrar que a informação sempre existiu. Antecipe isso: sua tese não é a ausência do documento, é a ausência de informação clara sobre o que a tarifa paga. Assim, mesmo que o contrato completo entre nos autos, o pedido continua de pé.",
          itens: [
            "Deixe claro na réplica que a tese é informação inadequada, não falta de papel.",
            "Se o contrato integral aparecer, foque na legibilidade e no destaque da cláusula.",
            "Registre desde já que juntada tardia não convalida a cobrança.",
          ],
        },
        contrapor: {
          resumo:
            "Mesmo sendo favorável, esse julgado tem uma brecha que a outra parte pode explorar: ele foi decidido num cenário de prova documental muito frágil do banco. Se o Banco Horizonte comparecer com contrato assinado, cláusula destacada e comprovante do serviço, o caso deixa de ser igual e o precedente perde força. Saiba dizer por que o seu caso ainda se encaixa.",
          itens: [
            "A defesa vai dizer que a tarifa estava prevista no verso — responda com adesão e falta de destaque.",
            "Se citarem a Súmula 566 do STJ, recorte: aqui há reincidência de tarifa, não primeira contratação.",
            "Tenha pronta a distinção entre previsão contratual e informação adequada.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000051-02.2021.8.16.0000",
        acordao: "Acórdão 198.440",
        court: "TJPR",
        chamber: "15ª Câmara Cível",
        reporter: "Des. Paulo Freire",
        date: "03/11/2022",
        status: "SENTENCIADO",
        alignment: "against",
        ementa: "Tarifa de cadastro admitida na primeira contratação. Juros mantidos.",
        pontos: ["Tarifa de cadastro validada", "CDC afastado em parte"],
        essencial: {
          resumo:
            "Aqui a Câmara validou a tarifa de cadastro por entender que ela remunera o início do relacionamento bancário e estava prevista no contrato. Os juros foram mantidos porque a taxa ficava dentro da média do mercado apurada pelo Banco Central. É o acórdão que a defesa vai usar contra você, e ele é bem fundamentado.",
          itens: [
            "Tarifa de cadastro regular na abertura do relacionamento.",
            "Juros dentro da média do Bacen não são abusivos por si.",
            "Não havia prova de cobrança reiterada da mesma tarifa.",
          ],
        },
        fortalecer: {
          resumo:
            "Esse julgado te ajuda de um jeito indireto: ele delimita exatamente onde a tarifa é aceita — na primeira contratação. Use isso para reforçar o seu recorte, porque no nosso caso houve cobrança de tarifa de cadastro novamente no aditivo de renegociação de 2023. O precedente contrário, bem lido, virou régua a seu favor.",
          itens: [
            "Destaque que houve segunda cobrança no aditivo de novembro de 2023.",
            "Traga os dois documentos lado a lado para tornar a repetição visível.",
            "Use a própria fundamentação do acórdão para marcar a diferença.",
          ],
        },
        blindar: {
          resumo:
            "Não espere a defesa citar esse acórdão para reagir. Traga o distinguish já na réplica, dizendo que a discussão não é a legalidade abstrata da tarifa de cadastro, mas a cobrança repetida na renegociação. Quem antecipa o precedente contrário controla o enquadramento do caso.",
          itens: [
            "Antecipe na réplica que a Súmula não cobre tarifa cobrada duas vezes.",
            "Separe os capítulos: tarifas de um lado, juros de outro.",
            "Evite pedir nulidade genérica de todas as tarifas — enfraquece o pedido forte.",
          ],
        },
        contrapor: {
          resumo:
            "Para derrubar a força desse acórdão, ataque a premissa de fato: ele tratou de contratação única e sem repactuação. O nosso caso tem aditivo, nova tarifa e prestamista embutido, o que muda o quadro probatório. Sem a mesma base fática, o precedente não se transporta.",
          itens: [
            "A premissa foi contratação única — a nossa tem aditivo.",
            "Lá não havia seguro embutido sem assinatura separada; aqui há.",
            "A média do Bacen citada é de 2021, período diferente do contrato.",
          ],
        },
      },
      {
        id: "j3",
        processNumber: "9000058-28.2020.8.16.0000",
        acordao: "Acórdão 176.902",
        court: "TJPR",
        chamber: "12ª Câmara Cível",
        reporter: "Des. Renata Mello",
        date: "21/06/2022",
        status: "EM_RECURSO",
        alignment: "diverge",
        ementa: "Juros revisáveis. Tarifas mantidas. Dissídio interno sobre o CDC.",
        pontos: ["Juros acolhidos", "Tarifas rejeitadas", "Câmara dividida"],
        essencial: {
          resumo:
            "Este é um acórdão partido: a maioria aceitou revisar os juros, mas manteve as tarifas por estarem previstas no contrato. O voto vencido foi na direção oposta e sustentou que a previsão contratual não supre a falta de informação clara. Ou seja, dentro do mesmo julgado existem duas leituras utilizáveis.",
          itens: [
            "Maioria: tarifas contratualmente previstas são lícitas.",
            "Voto vencido: falta de informação clara macula a cláusula.",
            "Juros revisados por desproporção com a média do período.",
          ],
        },
        fortalecer: {
          resumo:
            "Não cite este acórdão inteiro — isole o que serve. A parte dos juros é boa para você e vem de um colegiado que costuma dialogar com a 13ª Câmara. O voto vencido, embora não vincule, é ótimo material argumentativo porque mostra que a tese da informação inadequada já circula no tribunal.",
          itens: [
            "Use só o capítulo dos juros na sua fundamentação principal.",
            "Cite o voto vencido como reforço da tese de informação inadequada.",
            "Indique a página exata do trecho para evitar leitura ampliada.",
          ],
        },
        blindar: {
          resumo:
            "O risco é a defesa juntar o mesmo acórdão para provar que tarifas previstas são válidas. Como o documento tem as duas coisas, deixe registrado desde o início qual capítulo você invoca e por quê. Assim, se a outra parte citar o resto, já existe nos autos a delimitação que você fez.",
          itens: [
            "Registre expressamente que invoca apenas o capítulo dos juros.",
            "Aponte que a divergência interna reduz a força do capítulo das tarifas.",
            "Guarde a íntegra do voto vencido como anexo pronto.",
          ],
        },
        contrapor: {
          resumo:
            "Se a defesa usar o acórdão completo, sua resposta é a própria divergência: um colegiado dividido não produz orientação firme. Mostre que a parte das tarifas foi decidida por maioria estreita e que o voto vencido enfrenta exatamente o nosso argumento. Divergência interna é argumento de fragilidade, use isso.",
          itens: [
            "Maioria estreita não forma jurisprudência consolidada.",
            "O voto vencido enfrenta o ponto da informação, o da maioria não.",
            "O julgado está em recurso, o que reduz seu peso como precedente.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "13ª Câmara Cível", orientacao: "Revisa tarifas sem serviço comprovado", versus: "for", nota: "Alinha com o nosso caso." },
      { camara: "15ª Câmara Cível", orientacao: "Valida tarifa de cadastro na primeira contratação", versus: "against", nota: "Precisa de distinguish pelo aditivo." },
      { camara: "12ª Câmara Cível", orientacao: "Revisa juros, mantém tarifas", versus: "diverge", nota: "Aproveitar só o capítulo dos juros." },
    ],
    jurimetria: {
      amostra: 30,
      padrao: "A 13ª acolhe revisão em 7 de cada 10 casos com contrato incompleto.",
      interno: "Neste escritório, 4 de 5 casos bancários com a mesma tese fecharam acordo.",
      riscos: ["Redistribuição para a 15ª Câmara", "Juntada tardia do contrato integral pelo banco"],
    },
  },
  {
    id: "consignado",
    titulo: "Consignado não contratado",
    tema: "empréstimo consignado · aposentado · desconto no benefício",
    subtema: "Consignado",
    processNumber: "9000043-74.2025.8.16.0003",
    court: "TJPR",
    chamber: "10ª Câmara Cível",
    status: "EM_RECURSO",
    cliente: "José Amir Ribeiro",
    partes: [
      { papel: "Autor", nome: "José Amir Ribeiro" },
      { papel: "Réu", nome: "Banco Meridiano Financeira S.A." },
    ],
    resumo:
      "Aposentado passou a ter descontos no benefício por um consignado que afirma nunca ter contratado.",
    tese: "Contratação fraudulenta gera devolução dos descontos e dano moral in re ipsa.",
    atualizacao: "Apelação do banco distribuída sexta",
    chance: 68,
    chanceRotulo: "Caminho aberto",
    chanceTexto:
      "A 10ª confirma a fraude quando não há assinatura válida. A discussão do recurso é o valor do dano moral, não a fraude.",
    votos: { for: 11, against: 6, diverge: 3 },
    peticoes: [
      doc("p1", "Petição inicial", "Peça", "04/02/2025", "Acervo interno", "Declaratória de inexistência de débito com devolução e dano moral."),
      doc("p2", "Pedido de tutela de urgência", "Peça", "04/02/2025", "Acervo interno", "Suspensão imediata dos descontos no benefício."),
      doc("p3", "Impugnação ao laudo grafotécnico", "Peça", "12/06/2025", "Acervo interno", "Aponta divergência entre a assinatura do contrato e a do cliente."),
      doc("p4", "Contrarrazões de apelação", "Peça", "08/09/2026", "Acervo interno", "Defende a sentença e o valor fixado a título de dano moral."),
    ],
    contratos: [
      doc("c1", "Contrato de consignado nº 55.201", "Contrato", "2024", "Banco", "Documento apresentado pelo banco, com assinatura questionada."),
      doc("c2", "Termo de autorização de desconto", "Contrato", "2024", "Banco", "Autorização sem reconhecimento de firma e sem testemunhas."),
    ],
    documentos: [
      doc("d1", "Extratos do benefício INSS", "Cliente", "01/02/2025", "Cliente", "Mostra o início dos descontos e o valor mensal retido."),
      doc("d2", "Boletim de ocorrência", "Cliente", "28/01/2025", "Cliente", "Registro da suspeita de fraude feito pelo cliente."),
      doc("d3", "Documentos pessoais e assinatura padrão", "Cliente", "01/02/2025", "Cliente", "Base de comparação usada na perícia grafotécnica."),
      doc("d4", "Laudo grafotécnico", "Perícia", "20/05/2025", "Perito judicial", "Conclui pela não autoria da assinatura no contrato."),
    ],
    decisoes: [
      doc("de1", "Tutela deferida", "Decisão", "07/02/2025", "TJPR", "Suspendeu os descontos em 48 horas, sob multa diária."),
      doc("de2", "Sentença de procedência", "Sentença", "15/07/2026", "TJPR", "Débito inexistente, devolução em dobro e dano moral de R$ 12.000."),
      doc("de3", "Decisão de admissibilidade", "Decisão", "05/09/2026", "TJPR", "Recebeu a apelação do banco apenas no efeito devolutivo."),
    ],
    modelos: [
      doc("m1", "Modelo de declaratória com tutela", "Modelo", "2024", "Biblioteca", "Peça-base para fraude em consignado de aposentado."),
      doc("m2", "Roteiro de impugnação grafotécnica", "Modelo", "2025", "Biblioteca", "Perguntas que costumam desmontar laudo do banco."),
      doc("m3", "Parecer interno sobre dano moral em fraude", "Parecer", "2025", "Biblioteca", "Faixas de valor praticadas por câmara no TJPR."),
    ],
    historico: [
      { data: "08/09/2026", titulo: "Contrarrazões", detalhe: "Protocoladas no prazo, com foco no valor do dano." },
      { data: "15/07/2026", titulo: "Sentença", detalhe: "Procedência integral." },
      { data: "20/05/2025", titulo: "Laudo", detalhe: "Perícia concluiu que a assinatura não é do cliente." },
      { data: "04/02/2025", titulo: "Ajuizamento", detalhe: "Com pedido de tutela de urgência." },
    ],
    teses: [
      { id: "t1", titulo: "Fraude na contratação", uso: "Pedido principal.", forca: "alta" },
      { id: "t2", titulo: "Dano moral in re ipsa no benefício", uso: "Pedido indenizatório.", forca: "alta" },
      { id: "t3", titulo: "Devolução em dobro", uso: "Pedido acessório.", forca: "media" },
    ],
    resultados: [
      { id: "r1", titulo: "Caso Salvatore · 2024", desfecho: "Acordo em segunda instância por R$ 15.000.", aprendizado: "O valor subiu quando o laudo grafotécnico entrou como anexo 1." },
      { id: "r2", titulo: "Caso Bernardes · 2023", desfecho: "Procedência mantida em apelação.", aprendizado: "Extrato do INSS em uma página convence mais que planilha longa." },
    ],
    conversas: [
      { id: "cv1", autora: "Marina Costa", papel: "Advogada", hora: "11:05", texto: "No recurso eles só atacam o valor. A fraude já está fora de discussão." },
      { id: "cv2", autora: "Memória", papel: "IA do caso", hora: "11:07", texto: "A sentença já reconheceu a fraude. Duas contrarrazões internas usaram esse mesmo recorte.", ia: true },
      { id: "cv3", autora: "Ana Prado", papel: "Sócia", hora: "11:20", texto: "@Marina Costa se propuserem acordo acima de 12 mil, vale conversar com o cliente." },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000040-02.2023.8.16.0000",
        acordao: "Acórdão 208.114",
        court: "TJPR",
        chamber: "10ª Câmara Cível",
        reporter: "Des. Lúcia Ferraz",
        date: "19/03/2024",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "for",
        ementa: "Consignado fraudulento. Descontos em benefício. Dano moral configurado.",
        pontos: ["Assinatura falsa", "Dano moral in re ipsa", "Devolução em dobro"],
        essencial: {
          resumo:
            "A Câmara tratou o desconto indevido em benefício previdenciário como dano moral presumido, sem exigir prova de sofrimento. O ponto decisivo foi o laudo grafotécnico afastando a autoria da assinatura, o que jogou o risco da operação inteiramente sobre o banco. A devolução foi fixada em dobro por se tratar de cobrança indevida sem engano justificável.",
          itens: [
            "Verba alimentar retida gera dano moral presumido.",
            "Risco da atividade bancária recai sobre a instituição.",
            "Sem engano justificável, a devolução é em dobro.",
          ],
        },
        fortalecer: {
          resumo:
            "O que sustentou o valor da indenização foi a demonstração concreta do impacto no orçamento do aposentado. Traga o extrato do INSS mostrando quanto do benefício foi comprometido por mês e por quanto tempo. Número claro sustenta valor alto muito melhor do que adjetivo em petição.",
          itens: [
            "Mostre o percentual do benefício comprometido mês a mês.",
            "Coloque o laudo grafotécnico como primeiro anexo das contrarrazões.",
            "Some o tempo total de desconto para dimensionar o dano.",
          ],
        },
        blindar: {
          resumo:
            "O banco costuma sustentar que também foi vítima da fraude e que agiu de boa-fé. Feche essa porta antecipadamente lembrando que a conferência de documentos é dever dele, não do cliente. Boa-fé pode afastar a dobra, mas não afasta o dever de indenizar — deixe essa separação explícita.",
          itens: [
            "Boa-fé alegada não transfere o risco da operação ao consumidor.",
            "Peça que o banco demonstre qual conferência documental fez.",
            "Sustente a dobra e, em subsidiário, ao menos a devolução simples.",
          ],
        },
        contrapor: {
          resumo:
            "A brecha que a defesa pode explorar é o valor: existem julgados da mesma Câmara fixando indenizações bem menores quando o desconto durou poucos meses. Se a duração no nosso caso for curta, prepare a resposta pelo critério do impacto proporcional na renda, não pelo tempo isolado.",
          itens: [
            "A defesa vai comparar com casos de desconto de dois ou três meses.",
            "Responda pelo impacto proporcional na renda mensal.",
            "Lembre que houve necessidade de tutela de urgência para cessar o desconto.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000036-96.2022.8.16.0000",
        acordao: "Acórdão 189.337",
        court: "TJPR",
        chamber: "17ª Câmara Cível",
        reporter: "Des. André Luiz",
        date: "02/09/2023",
        status: "BAIXADO",
        alignment: "against",
        ementa: "Dano moral afastado. Devolução simples. Desconto cessado em curto prazo.",
        pontos: ["Dano moral não reconhecido", "Devolução simples"],
        essencial: {
          resumo:
            "Nesse julgado a Câmara reconheceu a fraude, mas negou o dano moral porque o banco cessou os descontos rapidamente e devolveu os valores antes da sentença. A devolução foi simples, sob o argumento de erro escusável. É o precedente que a defesa vai usar para tentar reduzir a condenação.",
          itens: [
            "Fraude reconhecida, dano moral afastado.",
            "Cessação rápida dos descontos pesou a favor do banco.",
            "Erro escusável afastou a devolução em dobro.",
          ],
        },
        fortalecer: {
          resumo:
            "Leia esse acórdão como um mapa do que não pode acontecer no seu caso. Ele mostra que a conduta posterior do banco é levada em conta: quem corrige rápido paga menos. No nosso processo foi necessária tutela de urgência e multa diária para cessar o desconto, e isso é exatamente o oposto do cenário do julgado.",
          itens: [
            "Destaque que só houve cessação após ordem judicial e multa.",
            "Registre quantos dias o banco ignorou a reclamação administrativa.",
            "Use a diferença de conduta como fundamento do valor.",
          ],
        },
        blindar: {
          resumo:
            "A defesa vai tentar colar esse precedente no nosso caso alegando devolução espontânea. Blinde-se documentando a linha do tempo: reclamação, silêncio, ação, tutela, multa. Com a cronologia nos autos, o argumento de correção espontânea não sobrevive à leitura dos próprios documentos.",
          itens: [
            "Monte a cronologia em quatro datas na primeira página.",
            "Junte o protocolo da reclamação administrativa sem resposta.",
            "Cite a multa diária como prova de resistência do banco.",
          ],
        },
        contrapor: {
          resumo:
            "Para neutralizar o precedente, ataque a base fática: lá o desconto durou pouco e foi revertido sem intervenção judicial. Aqui houve retenção prolongada de verba alimentar e necessidade de tutela. Sem identidade de fatos, o precedente não serve para reduzir a condenação.",
          itens: [
            "Duração e conduta posterior são completamente diferentes.",
            "Lá não houve tutela de urgência; aqui houve com multa.",
            "O julgado está baixado e não formou orientação na 10ª Câmara.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "10ª Câmara Cível", orientacao: "Dano moral presumido em desconto de benefício", versus: "for", nota: "Nossa câmara." },
      { camara: "17ª Câmara Cível", orientacao: "Exige repercussão concreta para o dano", versus: "against", nota: "Cuidado no capítulo do valor." },
    ],
    jurimetria: {
      amostra: 20,
      padrao: "Fraude em consignado é reconhecida em 68% dos casos com laudo grafotécnico favorável.",
      interno: "O escritório venceu 3 de 4 casos iguais quando a linha do tempo estava clara.",
      riscos: ["Recurso foca no valor, não na fraude", "Proposta de acordo abaixo da faixa da câmara"],
    },
  },
  {
    id: "veiculo",
    titulo: "Capitalização em financiamento de veículo",
    tema: "financiamento de veículo · capitalização · tabela price",
    subtema: "Financiamento",
    processNumber: "9000049-78.2025.8.16.0004",
    court: "TJPR",
    chamber: "14ª Câmara Cível",
    status: "AGUARDANDO_MANIFESTACAO",
    cliente: "Helena Duarte Martins",
    partes: [
      { papel: "Autora", nome: "Helena Duarte Martins" },
      { papel: "Réu", nome: "Banco Cortez Financiamentos S.A." },
    ],
    resumo:
      "Financiamento de 48 parcelas em que a cliente aponta capitalização mensal e seguro embutido sem escolha.",
    tese: "Capitalização exige previsão clara e destacada; venda casada de seguro é abusiva.",
    atualizacao: "Aguardando manifestação do banco sobre o laudo",
    chance: 55,
    chanceRotulo: "Disputa equilibrada",
    chanceTexto:
      "A 14ª aceita a tese quando o contrato não destaca a capitalização. O seguro embutido é o ponto mais forte do caso.",
    votos: { for: 12, against: 9, diverge: 4 },
    peticoes: [
      doc("p1", "Petição inicial", "Peça", "22/07/2025", "Acervo interno", "Revisão do contrato com recálculo pelo método linear e devolução do seguro."),
      doc("p2", "Réplica", "Peça", "10/10/2025", "Acervo interno", "Enfrenta a alegação de que a capitalização estava pactuada."),
      doc("p3", "Quesitos para a perícia", "Peça", "02/02/2026", "Acervo interno", "Sete quesitos focados no método de amortização aplicado."),
      doc("p4", "Manifestação sobre o laudo", "Peça", "20/08/2026", "Acervo interno", "Concorda com o laudo e pede a redução das parcelas vincendas."),
    ],
    contratos: [
      doc("c1", "Cédula de crédito com alienação fiduciária", "Contrato", "15/04/2023", "Cliente", "48 parcelas fixas, com CET destacado apenas no rodapé."),
      doc("c2", "Proposta de seguro do veículo", "Contrato", "15/04/2023", "Cliente", "Seguro incluído na mesma assinatura do financiamento."),
      doc("c3", "Termo de garantia estendida", "Contrato", "15/04/2023", "Cliente", "Produto adicional cobrado sem contratação separada."),
    ],
    documentos: [
      doc("d1", "Carnê e comprovantes de pagamento", "Cliente", "25/07/2025", "Cliente", "31 parcelas pagas até a distribuição da ação."),
      doc("d2", "Simulação entregue na loja", "Cliente", "18/07/2025", "Cliente", "Valor de parcela divergente do contrato assinado."),
      doc("d3", "Laudo contábil pericial", "Perícia", "05/08/2026", "Perito judicial", "Confirma capitalização mensal e aponta diferença de R$ 6.480."),
      doc("d4", "Consulta ao CET do Bacen", "Trabalho interno", "20/07/2025", "Equipe", "Comparativo da taxa contratada com a média do período."),
    ],
    decisoes: [
      doc("de1", "Decisão de inversão do ônus", "Decisão", "12/09/2025", "TJPR", "Reconheceu relação de consumo e inverteu o ônus da prova."),
      doc("de2", "Decisão que nomeou perito", "Decisão", "20/01/2026", "TJPR", "Perícia contábil com honorários rateados."),
      doc("de3", "Despacho de intimação", "Despacho", "10/08/2026", "TJPR", "Abre prazo ao banco para se manifestar sobre o laudo."),
    ],
    modelos: [
      doc("m1", "Modelo de revisional de veículo", "Modelo", "2024", "Biblioteca", "Peça-base com pedidos separados por capítulo."),
      doc("m2", "Quesitos padrão de perícia contábil", "Modelo", "2023", "Biblioteca", "Lista validada por dois peritos do TJPR."),
      doc("m3", "Parecer sobre venda casada de seguro", "Parecer", "2025", "Biblioteca", "Resumo do que o tribunal considera contratação autônoma."),
      doc("m4", "Modelo de manifestação sobre laudo", "Modelo", "2024", "Biblioteca", "Estrutura curta para concordar e já pedir o efeito prático."),
    ],
    historico: [
      { data: "10/08/2026", titulo: "Intimação", detalhe: "Banco intimado para falar sobre o laudo." },
      { data: "05/08/2026", titulo: "Laudo pericial", detalhe: "Capitalização mensal confirmada." },
      { data: "12/09/2025", titulo: "Inversão do ônus", detalhe: "Relação de consumo reconhecida." },
      { data: "22/07/2025", titulo: "Distribuição", detalhe: "14ª Câmara Cível do TJPR." },
    ],
    teses: [
      { id: "t1", titulo: "Capitalização sem destaque", uso: "Pedido principal de recálculo.", forca: "media" },
      { id: "t2", titulo: "Venda casada de seguro", uso: "Pedido de devolução.", forca: "alta" },
      { id: "t3", titulo: "Divergência entre simulação e contrato", uso: "Reforço de informação inadequada.", forca: "media" },
    ],
    resultados: [
      { id: "r1", titulo: "Caso Ferreira · 2024", desfecho: "Recálculo deferido e devolução do seguro.", aprendizado: "O pedido do seguro passou sozinho, mesmo com a capitalização negada." },
      { id: "r2", titulo: "Caso Sandrini · 2023", desfecho: "Improcedência no capítulo dos juros.", aprendizado: "Sem perícia, a tese de capitalização não anda nesta câmara." },
    ],
    conversas: [
      { id: "cv1", autora: "Ana Prado", papel: "Sócia", hora: "16:20", texto: "O laudo veio bom. Vamos pedir logo a redução das vincendas." },
      { id: "cv2", autora: "João Lima", papel: "Estagiário", hora: "16:35", texto: "Achei a simulação da loja com parcela diferente. Anexei no acervo do cliente." },
      { id: "cv3", autora: "Memória", papel: "IA do caso", hora: "16:36", texto: "Dois casos internos ganharam só no capítulo do seguro. Vale manter os pedidos separados.", ia: true },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000057-38.2023.8.16.0000",
        acordao: "Acórdão 211.455",
        court: "TJPR",
        chamber: "14ª Câmara Cível",
        reporter: "Des. Carla Nunes",
        date: "10/04/2024",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "for",
        ementa: "Capitalização sem destaque contratual. Recálculo determinado. Seguro devolvido.",
        pontos: ["Capitalização não destacada", "Venda casada", "Recálculo linear"],
        essencial: {
          resumo:
            "A Câmara aceitou o recálculo porque a capitalização aparecia apenas no CET, sem cláusula própria e destacada. Sobre o seguro, entendeu que oferecer o produto na mesma assinatura do financiamento retira a liberdade de escolha do consumidor. Os dois capítulos foram julgados de forma independente, o que é importante para a estratégia.",
          itens: [
            "Previsão no CET não substitui cláusula clara de capitalização.",
            "Seguro na mesma assinatura configura venda casada.",
            "Capítulos julgados separadamente, com resultados distintos.",
          ],
        },
        fortalecer: {
          resumo:
            "A força desse precedente está na prova técnica. Foi o laudo que traduziu a capitalização em número, e é isso que convence esta Câmara. Coloque o valor apurado pela perícia no pedido, mostre a diferença mensal na parcela e mantenha o capítulo do seguro separado para que ele possa vencer sozinho.",
          itens: [
            "Traga o valor apurado no laudo já no pedido principal.",
            "Mostre a diferença na parcela, não só o total.",
            "Mantenha capitalização e seguro como capítulos independentes.",
          ],
        },
        blindar: {
          resumo:
            "O ataque previsível é o banco sustentar que a capitalização estava pactuada porque o CET constava do contrato. Antecipe-se sustentando que informação escondida em rodapé não é informação destacada, e que a própria simulação entregue na loja trazia parcela diferente. A contradição documental é a sua melhor proteção aqui.",
          itens: [
            "Sustente que CET em rodapé não é cláusula destacada.",
            "Junte a simulação da loja ao lado do contrato assinado.",
            "Peça que o banco indique a cláusula exata da capitalização.",
          ],
        },
        contrapor: {
          resumo:
            "Mesmo favorável, o julgado tem um limite: ele exigiu perícia para reconhecer a capitalização. Se o banco tentar afastar a prova técnica ou pedir nova perícia, o precedente pode virar contra você. Deixe claro que o laudo é conclusivo e que a impugnação genérica não abre nova instrução.",
          itens: [
            "A defesa pode pedir segunda perícia — responda com a conclusão categórica do laudo.",
            "Se citarem contratos com cláusula expressa, mostre que o nosso não tem.",
            "Impugnação sem quesito novo não justifica nova prova.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000046-43.2022.8.16.0000",
        acordao: "Acórdão 188.004",
        court: "TJPR",
        chamber: "16ª Câmara Cível",
        reporter: "Des. Sérgio Prado",
        date: "05/12/2023",
        status: "BAIXADO",
        alignment: "diverge",
        ementa: "Capitalização admitida por previsão no CET. Seguro devolvido por venda casada.",
        pontos: ["Capitalização mantida", "Seguro devolvido", "Julgamento dividido"],
        essencial: {
          resumo:
            "Aqui a Câmara manteve a capitalização entendendo que a indicação do CET era suficiente, mas condenou o banco a devolver o seguro por falta de contratação autônoma. É um acórdão de resultado misto: perde no capítulo técnico, ganha no capítulo do produto embutido. Serve para os dois lados, e por isso precisa ser citado com recorte.",
          itens: [
            "CET considerado suficiente para a capitalização.",
            "Seguro devolvido por ausência de escolha real.",
            "Resultado misto no mesmo julgamento.",
          ],
        },
        fortalecer: {
          resumo:
            "Use este acórdão apenas para o seguro. Ele mostra que, mesmo em câmara mais rígida no aspecto técnico, a venda casada não passa. Isso reforça que o capítulo do seguro tem vida própria e pode vencer independentemente do resultado da perícia — exatamente a estratégia adotada nos nossos casos anteriores.",
          itens: [
            "Cite apenas o capítulo do seguro deste julgado.",
            "Reforce que o pedido do seguro não depende da perícia.",
            "Some ao caso Ferreira, que teve o mesmo desfecho interno.",
          ],
        },
        blindar: {
          resumo:
            "Se você citar este acórdão sem delimitar, entrega à defesa a parte que valida a capitalização por CET. Registre nos autos, de forma expressa, qual capítulo está sendo invocado. Precedente de resultado misto exige recorte explícito, senão trabalha contra quem cita.",
          itens: [
            "Delimite por escrito que invoca só o capítulo do seguro.",
            "Não transcreva o trecho sobre o CET na sua peça.",
            "Tenha pronta a distinção entre as duas câmaras.",
          ],
        },
        contrapor: {
          resumo:
            "Quando a defesa usar a parte da capitalização, responda que o julgado é de outra câmara e que a nossa 14ª exige cláusula destacada, não apenas CET. Além disso, lá não havia laudo pericial conclusivo como o que temos aqui. Câmara diferente e prova diferente afastam a aplicação.",
          itens: [
            "É precedente da 16ª, não da 14ª Câmara.",
            "Lá não houve perícia conclusiva; aqui houve.",
            "A orientação da nossa câmara é mais exigente quanto ao destaque.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "14ª Câmara Cível", orientacao: "Exige cláusula destacada de capitalização", versus: "for", nota: "Nossa câmara." },
      { camara: "16ª Câmara Cível", orientacao: "Aceita CET como pactuação", versus: "diverge", nota: "Usar só o capítulo do seguro." },
    ],
    jurimetria: {
      amostra: 25,
      padrao: "Com laudo conclusivo, o recálculo é deferido em 12 de 25 casos. O seguro cai em quase todos.",
      interno: "O escritório nunca perdeu o capítulo do seguro embutido.",
      riscos: ["Pedido de nova perícia pelo banco", "Capítulo da capitalização é o mais frágil"],
    },
  },
  {
    id: "conta-salario",
    titulo: "Descontos em conta salário",
    tema: "conta salário · desconto automático · verba alimentar",
    subtema: "Conta salário",
    processNumber: "9000037-56.2024.8.16.0018",
    court: "TJPR",
    chamber: "13ª Câmara Cível",
    status: "SENTENCIADO",
    cliente: "Rafael Nogueira Alves",
    partes: [
      { papel: "Autor", nome: "Rafael Nogueira Alves" },
      { papel: "Réu", nome: "Banco Horizonte S.A." },
    ],
    resumo:
      "Banco passou a debitar parcelas de empréstimo direto do salário do cliente, zerando a conta todo mês.",
    tese: "Débito automático que consome a remuneração viola a impenhorabilidade do salário.",
    atualizacao: "Sentença de procedência publicada",
    chance: 84,
    chanceRotulo: "Tese consolidada",
    chanceTexto:
      "O TJPR limita o desconto a 30% da remuneração de forma bem estável. A discussão restante é só o dano moral.",
    votos: { for: 22, against: 3, diverge: 2 },
    peticoes: [
      doc("p1", "Petição inicial com tutela", "Peça", "11/11/2024", "Acervo interno", "Pede limitação dos descontos a 30% e devolução do excedente."),
      doc("p2", "Réplica", "Peça", "20/01/2025", "Acervo interno", "Enfrenta a tese de autorização contratual de débito."),
      doc("p3", "Memoriais", "Peça", "12/08/2026", "Acervo interno", "Resume a prova em duas páginas antes da sentença."),
    ],
    contratos: [
      doc("c1", "Contrato de empréstimo pessoal", "Contrato", "2023", "Cliente", "Prevê débito em conta como forma de pagamento."),
      doc("c2", "Termo de abertura de conta salário", "Contrato", "2019", "Cliente", "Conta destinada exclusivamente ao recebimento de salário."),
    ],
    documentos: [
      doc("d1", "Extratos com débitos integrais", "Cliente", "2024", "Cliente", "Mostra a conta zerada no mesmo dia do crédito do salário."),
      doc("d2", "Holerites", "Cliente", "2024", "Cliente", "Comprovam a natureza salarial do valor depositado."),
      doc("d3", "Reclamação no Banco Central", "Cliente", "2024", "Cliente", "Registro administrativo sem solução."),
      doc("d4", "Planilha do excedente a 30%", "Trabalho interno", "2024", "Equipe", "Cálculo mês a mês do valor a devolver."),
    ],
    decisoes: [
      doc("de1", "Tutela deferida", "Decisão", "18/11/2024", "TJPR", "Limitou imediatamente os descontos a 30% da remuneração."),
      doc("de2", "Sentença de procedência", "Sentença", "29/08/2026", "TJPR", "Confirmou a limitação, devolução do excedente e dano moral de R$ 8.000."),
    ],
    modelos: [
      doc("m1", "Modelo de ação com tutela sobre conta salário", "Modelo", "2024", "Biblioteca", "Peça padrão do escritório, alta taxa de deferimento."),
      doc("m2", "Parecer sobre limite de 30%", "Parecer", "2023", "Biblioteca", "Levantamento das decisões do TJPR sobre o percentual."),
      doc("m3", "Modelo de memoriais curtos", "Modelo", "2025", "Biblioteca", "Duas páginas, um argumento por parágrafo."),
    ],
    historico: [
      { data: "29/08/2026", titulo: "Sentença", detalhe: "Procedência com dano moral fixado." },
      { data: "18/11/2024", titulo: "Tutela", detalhe: "Descontos limitados a 30%." },
      { data: "11/11/2024", titulo: "Distribuição", detalhe: "13ª Câmara Cível do TJPR." },
    ],
    teses: [
      { id: "t1", titulo: "Impenhorabilidade do salário", uso: "Pedido principal.", forca: "alta" },
      { id: "t2", titulo: "Limite de 30% da remuneração", uso: "Critério do pedido.", forca: "alta" },
      { id: "t3", titulo: "Dano moral pela privação de renda", uso: "Pedido indenizatório.", forca: "media" },
    ],
    resultados: [
      { id: "r1", titulo: "Este caso", desfecho: "Procedência integral em primeiro grau.", aprendizado: "Extrato mostrando a conta zerada no dia do salário foi a prova decisiva." },
      { id: "r2", titulo: "Caso Prestes · 2024", desfecho: "Acordo após a tutela.", aprendizado: "Depois da liminar, o banco praticamente sempre propõe acordo." },
    ],
    conversas: [
      { id: "cv1", autora: "Gustavo Vilela", papel: "Advogado", hora: "14:02", texto: "Sentença saiu boa. Se recorrerem, é só pelo dano moral." },
      { id: "cv2", autora: "Ana Prado", papel: "Sócia", hora: "14:15", texto: "@João Lima já deixa as contrarrazões engatilhadas com o modelo de 2025." },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000052-16.2023.8.16.0000",
        acordao: "Acórdão 216.320",
        court: "TJPR",
        chamber: "13ª Câmara Cível",
        reporter: "Des. Helena Vargas",
        date: "11/05/2024",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "for",
        ementa: "Débito em conta salário limitado a 30% da remuneração. Devolução do excedente.",
        pontos: ["Impenhorabilidade", "Limite de 30%", "Devolução do excedente"],
        essencial: {
          resumo:
            "A Câmara firmou que autorização contratual de débito não vence a natureza alimentar do salário. O banco pode descontar, mas não até o ponto de comprometer a subsistência, e o parâmetro adotado foi 30% da remuneração líquida. O excedente cobrado nos meses anteriores foi mandado devolver de forma simples.",
          itens: [
            "Autorização contratual não afasta a impenhorabilidade.",
            "Parâmetro objetivo de 30% da remuneração líquida.",
            "Excedente devolvido em valores simples, com correção.",
          ],
        },
        fortalecer: {
          resumo:
            "O elemento que fechou o julgamento foi visual: o extrato mostrando a conta zerada no mesmo dia do crédito do salário. Repita esse recurso. Coloque um mês representativo em destaque, com o crédito e o débito lado a lado, e depois a planilha do excedente. Prova simples e evidente vale mais do que argumento longo.",
          itens: [
            "Destaque um mês com crédito e débito no mesmo dia.",
            "Anexe a planilha do excedente organizada por mês.",
            "Junte os holerites para fixar a natureza salarial.",
          ],
        },
        blindar: {
          resumo:
            "O banco vai insistir que houve autorização expressa e que o cliente escolheu o débito automático. Deixe registrado que a conta é conta salário, não conta corrente comum, e que a autorização não pode transformar verba alimentar em garantia. Esse enquadramento derruba o argumento antes dele crescer.",
          itens: [
            "Junte o termo de abertura mostrando que é conta salário.",
            "Sustente que autorização não converte salário em garantia.",
            "Anexe a reclamação no Bacen sem resposta do banco.",
          ],
        },
        contrapor: {
          resumo:
            "A parte adversa costuma citar julgados que admitem desconto integral quando existe consignação em folha regular. Se surgir esse argumento, mostre que aqui não há consignado com margem controlada, e sim débito direto na conta, sem qualquer limite. São operações diferentes e o precedente não alcança o nosso caso.",
          itens: [
            "Distinga consignado com margem de débito automático em conta.",
            "Mostre que não havia controle de margem nenhum.",
            "O percentual descontado ultrapassou 70% em vários meses.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000045-92.2021.8.16.0000",
        acordao: "Acórdão 179.773",
        court: "TJPR",
        chamber: "15ª Câmara Cível",
        reporter: "Des. Elisa Barros",
        date: "22/08/2022",
        status: "EXTINTO",
        alignment: "against",
        ementa: "Débito autorizado em contrato. Dano moral afastado por ausência de prova concreta.",
        pontos: ["Autorização válida", "Dano moral negado"],
        essencial: {
          resumo:
            "Esse acórdão manteve os descontos por considerar válida a autorização contratual e negou o dano moral por falta de demonstração de prejuízo concreto. A Câmara exigiu prova de que o cliente ficou sem meios de subsistência, o que não foi feito. É o precedente que ameaça o capítulo indenizatório do nosso caso.",
          itens: [
            "Autorização contratual tratada como válida.",
            "Dano moral exige demonstração concreta de privação.",
            "Não houve prova de comprometimento da subsistência.",
          ],
        },
        fortalecer: {
          resumo:
            "Leia esse julgado como uma lista de provas que você precisa ter. Ele diz, na prática, que quem documenta a privação ganha o dano moral. Então junte comprovantes de contas atrasadas, de cheque devolvido ou de empréstimo emergencial no período — qualquer consequência concreta do salário ter sido consumido.",
          itens: [
            "Junte contas atrasadas ou negativação no período dos descontos.",
            "Mostre o percentual efetivo retido, mês a mês.",
            "Descreva consequências concretas, não sentimentos genéricos.",
          ],
        },
        blindar: {
          resumo:
            "Se o banco recorrer só do dano moral, esse é o acórdão que ele vai citar. Blinde-se ainda em primeiro grau, deixando a prova da privação nos autos antes da sentença. Contrarrazões com prova nova são frágeis; prova já produzida é o que sustenta o valor em segundo grau.",
          itens: [
            "Produza a prova da privação antes da sentença.",
            "Registre nos memoriais o impacto financeiro concreto.",
            "Cite o acórdão 216.320 da nossa câmara como contraponto direto.",
          ],
        },
        contrapor: {
          resumo:
            "Para afastar esse precedente, ataque a base fática e a câmara: lá o desconto era parcial e havia margem preservada, e a decisão veio da 15ª, que é mais restritiva. Aqui a conta era zerada integralmente, o que caracteriza privação por si mesma segundo a orientação da 13ª.",
          itens: [
            "Lá o desconto era parcial; aqui a conta era zerada.",
            "Precedente da 15ª Câmara, não da nossa.",
            "O processo foi extinto e não formou orientação firme.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "13ª Câmara Cível", orientacao: "Limita o desconto a 30%", versus: "for", nota: "Nossa câmara, orientação estável." },
      { camara: "15ª Câmara Cível", orientacao: "Exige prova concreta do dano", versus: "against", nota: "Risco só no capítulo indenizatório." },
    ],
    jurimetria: {
      amostra: 27,
      padrao: "A limitação a 30% é acolhida em 22 de 27 julgados analisados.",
      interno: "Todas as tutelas deste tema pedidas pelo escritório em 2026 foram deferidas.",
      riscos: ["Recurso do banco quanto ao valor do dano moral"],
    },
  },
  {
    id: "cartao",
    titulo: "Rotativo do cartão e renegociação",
    tema: "cartão de crédito · rotativo · juros compostos",
    subtema: "Cartão de crédito",
    processNumber: "9000039-74.2024.8.16.0002",
    court: "TJPR",
    chamber: "16ª Câmara Cível",
    status: "SUSPENSO",
    cliente: "Paula Almeida Ferraz",
    partes: [
      { papel: "Autora", nome: "Paula Almeida Ferraz" },
      { papel: "Réu", nome: "Banco Meridiano Cartões S.A." },
    ],
    resumo:
      "Dívida de cartão que saltou de R$ 4.200 para R$ 19.800 em 14 meses de rotativo e renegociações sucessivas.",
    tese: "Renegociação sucessiva que apenas capitaliza a dívida é abusiva e exige revisão do saldo.",
    atualizacao: "Suspenso por 60 dias para tentativa de conciliação",
    chance: 47,
    chanceRotulo: "Incerto",
    chanceTexto:
      "A 16ª aceita a limitação do rotativo em parte dos casos. O êxito depende muito de a perícia isolar os encargos.",
    votos: { for: 8, against: 9, diverge: 4 },
    peticoes: [
      doc("p1", "Petição inicial", "Peça", "09/05/2024", "Acervo interno", "Revisão do saldo com expurgo dos encargos do rotativo."),
      doc("p2", "Réplica", "Peça", "22/07/2024", "Acervo interno", "Enfrenta a alegação de adesão voluntária às renegociações."),
      doc("p3", "Petição de proposta conciliatória", "Peça", "05/08/2026", "Acervo interno", "Proposta de quitação com base no valor original corrigido."),
    ],
    contratos: [
      doc("c1", "Contrato de cartão de crédito", "Contrato", "2021", "Cliente", "Prevê rotativo e parcelamento automático da fatura."),
      doc("c2", "Primeiro termo de renegociação", "Contrato", "2023", "Banco", "Incorporou encargos ao principal sem discriminar valores."),
      doc("c3", "Segundo termo de renegociação", "Contrato", "2023", "Banco", "Nova incorporação de encargos sobre o saldo já renegociado."),
    ],
    documentos: [
      doc("d1", "Faturas de 14 meses", "Cliente", "2024", "Cliente", "Série completa mostrando a evolução do saldo."),
      doc("d2", "Comprovantes de pagamento mínimo", "Cliente", "2024", "Cliente", "Demonstra que a cliente pagou o mínimo todos os meses."),
      doc("d3", "Memória de cálculo interna", "Trabalho interno", "2024", "Equipe", "Separa principal, encargos e encargos sobre encargos."),
    ],
    decisoes: [
      doc("de1", "Decisão de inversão do ônus", "Decisão", "20/06/2024", "TJPR", "Reconheceu relação de consumo."),
      doc("de2", "Decisão de suspensão", "Decisão", "02/08/2026", "TJPR", "Suspende o feito por 60 dias para conciliação."),
    ],
    modelos: [
      doc("m1", "Modelo de revisional de cartão", "Modelo", "2024", "Biblioteca", "Peça-base com foco no expurgo de encargos."),
      doc("m2", "Parecer sobre rotativo após 2017", "Parecer", "2024", "Biblioteca", "Resumo da regulação do Bacen aplicável."),
      doc("m3", "Planilha de decomposição de saldo", "Modelo", "2023", "Biblioteca", "Separa principal e encargos de forma visual."),
    ],
    historico: [
      { data: "02/08/2026", titulo: "Suspensão", detalhe: "Sessão de conciliação designada." },
      { data: "20/06/2024", titulo: "Saneamento", detalhe: "Relação de consumo reconhecida." },
      { data: "09/05/2024", titulo: "Distribuição", detalhe: "16ª Câmara Cível do TJPR." },
    ],
    teses: [
      { id: "t1", titulo: "Abusividade do rotativo prolongado", uso: "Pedido principal.", forca: "media" },
      { id: "t2", titulo: "Renegociação que só capitaliza", uso: "Fundamento do expurgo.", forca: "media" },
      { id: "t3", titulo: "Falta de informação sobre o custo", uso: "Reforço da tese.", forca: "baixa" },
    ],
    resultados: [
      { id: "r1", titulo: "Caso Reis · 2024", desfecho: "Acordo com quitação por 35% do saldo.", aprendizado: "A planilha visual de decomposição destravou a negociação." },
    ],
    conversas: [
      { id: "cv1", autora: "Marina Costa", papel: "Advogada", hora: "10:14", texto: "Na conciliação eu levo só a planilha. Tese dura não ajuda nessa mesa." },
      { id: "cv2", autora: "Memória", papel: "IA do caso", hora: "10:15", texto: "O caso Reis fechou por 35% do saldo com a mesma estratégia de planilha.", ia: true },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000034-29.2022.8.16.0000",
        acordao: "Acórdão 195.009",
        court: "TJPR",
        chamber: "16ª Câmara Cível",
        reporter: "Des. Sérgio Prado",
        date: "17/02/2023",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "for",
        ementa: "Renegociações sucessivas que apenas incorporam encargos. Revisão do saldo deferida.",
        pontos: ["Encargos sobre encargos", "Saldo revisado"],
        essencial: {
          resumo:
            "A Câmara reconheceu que renegociar dívida de cartão apenas somando encargos ao principal cria um efeito de bola de neve incompatível com a boa-fé contratual. O ponto que decidiu foi a demonstração numérica de que o saldo crescia sem qualquer contrapartida de crédito novo. A revisão foi deferida para expurgar os encargos incorporados.",
          itens: [
            "Incorporação de encargos ao principal produz capitalização indireta.",
            "Cliente pagava o mínimo e ainda assim o saldo crescia.",
            "Revisão limitada ao expurgo, sem anular o contrato.",
          ],
        },
        fortalecer: {
          resumo:
            "O caminho aqui é aritmético, não retórico. Monte a planilha separando principal, encargos e encargos cobrados sobre encargos, e mostre a curva do saldo em uma linha só. Essa Câmara reage bem a evidência visual e mal a tese abstrata sobre abusividade de juros.",
          itens: [
            "Apresente a decomposição do saldo em três colunas.",
            "Mostre o total pago pela cliente ao lado do saldo devedor.",
            "Peça expurgo, não anulação — pedido mais estreito passa melhor.",
          ],
        },
        blindar: {
          resumo:
            "A defesa vai dizer que a cliente aderiu voluntariamente a cada renegociação. Antecipe que a adesão não foi informada, porque nenhum dos termos discriminou quanto do novo saldo era encargo. Sem discriminação, não existe consentimento válido sobre o custo, e isso protege o seu pedido.",
          itens: [
            "Aponte que os termos não discriminam principal e encargos.",
            "Sustente que adesão sem informação de custo não é consentimento.",
            "Junte os dois termos lado a lado para evidenciar a repetição.",
          ],
        },
        contrapor: {
          resumo:
            "Esse precedente tem um pressuposto que pode ser atacado: ele exigiu prova clara da incorporação de encargos. Se a perícia não conseguir isolar os valores, o argumento perde sustentação e a Câmara tende a manter o contrato. Tenha uma linha de defesa pronta caso o laudo venha inconclusivo.",
          itens: [
            "Sem isolamento dos encargos, o pedido enfraquece muito.",
            "A defesa vai sustentar taxa dentro da média do Bacen.",
            "Prepare a proposta de acordo como alternativa realista.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000044-10.2021.8.16.0000",
        acordao: "Acórdão 183.226",
        court: "TJPR",
        chamber: "18ª Câmara Cível",
        reporter: "Des. Mauro Pires",
        date: "08/06/2022",
        status: "ARQUIVADO_DEFINITIVAMENTE",
        alignment: "against",
        ementa: "Juros do rotativo dentro da média de mercado. Revisão negada.",
        pontos: ["Taxa dentro da média", "Pacta sunt servanda"],
        essencial: {
          resumo:
            "A Câmara negou a revisão porque a taxa do rotativo, embora alta, estava alinhada à média divulgada pelo Banco Central para o produto. O acórdão reforça que juros elevados não são automaticamente abusivos e que o consumidor tinha alternativa de parcelar a fatura. É o precedente central da defesa nesse tipo de caso.",
          itens: [
            "Taxa compatível com a média do Bacen para o rotativo.",
            "Existência de alternativa de parcelamento pesou contra o consumidor.",
            "Abusividade exige desproporção comprovada, não taxa alta.",
          ],
        },
        fortalecer: {
          resumo:
            "Esse julgado ajuda você a escolher a briga certa. Ele mostra que atacar a taxa em si é caminho perdido nesta jurisdição, mas nada diz sobre incorporação de encargos em renegociações sucessivas. Reposicione o pedido: o problema não é o percentual, é a forma de composição do saldo.",
          itens: [
            "Abandone o ataque frontal ao percentual dos juros.",
            "Concentre o pedido na composição do saldo renegociado.",
            "Use o próprio acórdão para mostrar que a nossa tese é outra.",
          ],
        },
        blindar: {
          resumo:
            "Se a sua peça der margem para ser lida como pedido de redução de taxa, esse precedente derruba o caso inteiro. Escreva o pedido de forma cirúrgica, deixando claro que não se discute a taxa contratada, e sim a base sobre a qual ela foi aplicada depois das renegociações.",
          itens: [
            "Escreva expressamente que não se questiona o percentual.",
            "Delimite o pedido ao expurgo dos encargos incorporados.",
            "Evite adjetivos como extorsivo, que atraem esse precedente.",
          ],
        },
        contrapor: {
          resumo:
            "Para neutralizar, mostre que lá não houve renegociação sucessiva: era rotativo puro, com uma única relação contratual. No nosso caso há dois termos que reciclaram encargos, o que cria um fato novo que o acórdão nunca examinou. Precedente não decide o que não foi discutido.",
          itens: [
            "Lá havia rotativo simples, sem termos de renegociação.",
            "A questão da incorporação de encargos não foi enfrentada.",
            "Precedente de outra câmara, já arquivado definitivamente.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "16ª Câmara Cível", orientacao: "Revisa saldo com encargos incorporados", versus: "for", nota: "Nossa câmara, mas por margem estreita." },
      { camara: "18ª Câmara Cível", orientacao: "Mantém taxa dentro da média do Bacen", versus: "against", nota: "Não atacar o percentual." },
    ],
    jurimetria: {
      amostra: 21,
      padrao: "Empate técnico. Casos com planilha de decomposição têm quase o dobro de êxito.",
      interno: "Acordos foram sempre melhores que sentença neste tema.",
      riscos: ["Laudo inconclusivo sobre os encargos", "Pedido lido como redução de taxa"],
    },
  },
  {
    id: "busca-apreensao",
    titulo: "Defesa em busca e apreensão",
    tema: "alienação fiduciária · purgação da mora · veículo",
    subtema: "Busca e apreensão",
    processNumber: "9000047-54.2024.8.16.0001",
    court: "TJPR",
    chamber: "18ª Câmara Cível",
    status: "EM_EXECUCAO",
    cliente: "Transportes Vale Norte Ltda.",
    partes: [
      { papel: "Autor", nome: "Banco Cortez Financiamentos S.A." },
      { papel: "Ré", nome: "Transportes Vale Norte Ltda." },
    ],
    resumo:
      "Banco pediu busca e apreensão de caminhão com 41 das 48 parcelas pagas, sem aceitar a purgação da mora.",
    tese: "Adimplemento substancial e direito de purgar a mora antes da consolidação da propriedade.",
    atualizacao: "Veículo liberado, discussão de encargos em curso",
    chance: 41,
    chanceRotulo: "Difícil, mas viável",
    chanceTexto:
      "A 18ª rejeita adimplemento substancial em regra, mas aceita a purgação integral. O caminho realista é pagar e discutir os encargos.",
    votos: { for: 6, against: 10, diverge: 3 },
    peticoes: [
      doc("p1", "Contestação", "Peça", "20/11/2024", "Acervo interno", "Adimplemento substancial e abusividade dos encargos de mora."),
      doc("p2", "Petição de purgação da mora", "Peça", "28/11/2024", "Acervo interno", "Depósito do débito com impugnação dos encargos cobrados."),
      doc("p3", "Impugnação ao cálculo do banco", "Peça", "15/01/2025", "Acervo interno", "Aponta cobrança de honorários acima do contratado."),
      doc("p4", "Petição de liberação do veículo", "Peça", "20/01/2025", "Acervo interno", "Pede restituição imediata após o depósito."),
    ],
    contratos: [
      doc("c1", "Contrato de financiamento com alienação fiduciária", "Contrato", "2021", "Cliente", "48 parcelas, garantia sobre o caminhão."),
      doc("c2", "Termo de vistoria do veículo", "Contrato", "2021", "Cliente", "Estado do bem na entrega."),
    ],
    documentos: [
      doc("d1", "Comprovantes das 41 parcelas pagas", "Cliente", "2024", "Cliente", "Base fática do adimplemento substancial."),
      doc("d2", "Notificação extrajudicial", "Banco", "2024", "Banco", "Constituição em mora antes da ação."),
      doc("d3", "Cálculo do débito atualizado", "Trabalho interno", "2024", "Equipe", "Confronto entre o valor cobrado e o devido."),
      doc("d4", "Fotos do veículo na apreensão", "Cliente", "2024", "Cliente", "Estado do bem no momento da retomada."),
    ],
    decisoes: [
      doc("de1", "Liminar de busca e apreensão", "Decisão", "18/11/2024", "TJPR", "Deferida em favor do banco."),
      doc("de2", "Decisão de liberação", "Decisão", "22/01/2025", "TJPR", "Restituiu o veículo após o depósito da purgação."),
      doc("de3", "Decisão sobre encargos", "Decisão", "12/08/2026", "TJPR", "Determinou recálculo dos honorários cobrados."),
    ],
    modelos: [
      doc("m1", "Modelo de purgação da mora", "Modelo", "2024", "Biblioteca", "Peça com depósito e impugnação simultâneos."),
      doc("m2", "Parecer sobre adimplemento substancial no TJPR", "Parecer", "2024", "Biblioteca", "Explica por que a tese quase não passa nesta câmara."),
      doc("m3", "Checklist de urgência em apreensão", "Modelo", "2023", "Biblioteca", "O que fazer nas primeiras 48 horas."),
    ],
    historico: [
      { data: "12/08/2026", titulo: "Recálculo", detalhe: "Honorários reduzidos por decisão." },
      { data: "22/01/2025", titulo: "Liberação", detalhe: "Caminhão devolvido à cliente." },
      { data: "28/11/2024", titulo: "Purgação", detalhe: "Depósito integral com impugnação." },
      { data: "18/11/2024", titulo: "Liminar", detalhe: "Apreensão deferida ao banco." },
    ],
    teses: [
      { id: "t1", titulo: "Purgação integral da mora", uso: "Estratégia principal.", forca: "alta" },
      { id: "t2", titulo: "Abusividade dos encargos de mora", uso: "Redução do valor do depósito.", forca: "media" },
      { id: "t3", titulo: "Adimplemento substancial", uso: "Tese subsidiária.", forca: "baixa" },
    ],
    resultados: [
      { id: "r1", titulo: "Caso Atlas Transportes · 2023", desfecho: "Veículo liberado em 6 dias.", aprendizado: "Depositar rápido e discutir encargos depois foi mais eficiente que brigar pela liminar." },
    ],
    conversas: [
      { id: "cv1", autora: "Gustavo Vilela", papel: "Advogado", hora: "18:30", texto: "Adimplemento substancial não passa nessa câmara. O caminho é purgar e discutir encargos." },
      { id: "cv2", autora: "Ana Prado", papel: "Sócia", hora: "18:44", texto: "@Marina Costa confirma com a cliente se o caminhão está rodando. Isso muda a urgência." },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000050-46.2023.8.16.0000",
        acordao: "Acórdão 213.041",
        court: "TJPR",
        chamber: "18ª Câmara Cível",
        reporter: "Des. Mauro Pires",
        date: "09/10/2023",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "against",
        ementa: "Adimplemento substancial afastado em alienação fiduciária. Purgação integral exigida.",
        pontos: ["Adimplemento substancial rejeitado", "Purgação integral"],
        essencial: {
          resumo:
            "A Câmara afastou o adimplemento substancial em contratos com alienação fiduciária, alinhada ao entendimento de que a lei específica exige o pagamento da integralidade do débito para impedir a consolidação da propriedade. Em compensação, reconheceu o direito de purgar a mora até a consolidação, com devolução do bem. É um acórdão contrário na tese e útil na saída.",
          itens: [
            "Adimplemento substancial não se aplica à alienação fiduciária.",
            "Purgação exige o débito integral, não só as parcelas vencidas.",
            "Purgada a mora, o bem deve ser restituído.",
          ],
        },
        fortalecer: {
          resumo:
            "Aceite o que o precedente dá e use isso rápido. Ele garante a devolução do veículo mediante depósito integral, e velocidade aqui vale dinheiro para uma transportadora. Deposite, peça a liberação imediata e mantenha viva a discussão sobre os encargos que compõem o valor depositado.",
          itens: [
            "Deposite o valor integral e peça liberação no mesmo ato.",
            "Impugne os encargos junto com o depósito, não depois.",
            "Documente o prejuízo pelo tempo em que o caminhão ficou parado.",
          ],
        },
        blindar: {
          resumo:
            "O risco maior é o banco inflar o valor da purgação com honorários e taxas fora do contrato, tornando o depósito inviável. Blinde-se apresentando seu próprio cálculo no momento do depósito e requerendo que a liberação não fique condicionada à concordância do banco com o valor.",
          itens: [
            "Apresente cálculo próprio junto com o depósito.",
            "Peça que a liberação não dependa da anuência do banco.",
            "Aponte item por item o que excede o contrato.",
          ],
        },
        contrapor: {
          resumo:
            "Se quiser manter viva a tese do adimplemento substancial para eventual recurso, o ponto de ataque é a proporção: aqui foram 41 de 48 parcelas, um percentual bem acima dos casos julgados por esta Câmara. Não conte com isso como estratégia principal, mas registre para preservar a discussão.",
          itens: [
            "Registre a proporção de 85% do contrato já cumprido.",
            "Sustente a função social do contrato como argumento de reforço.",
            "Mantenha a tese nos autos apenas para efeito de recurso.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000038-66.2022.8.16.0000",
        acordao: "Acórdão 186.740",
        court: "TJPR",
        chamber: "17ª Câmara Cível",
        reporter: "Des. Lúcia Ferraz",
        date: "14/07/2022",
        status: "BAIXADO",
        alignment: "for",
        ementa: "Encargos de mora excessivos reduzidos. Purgação recalculada.",
        pontos: ["Honorários reduzidos", "Recálculo da purgação"],
        essencial: {
          resumo:
            "Esse julgado enfrentou justamente o abuso na composição do valor da purgação. A Câmara reduziu honorários cobrados acima do previsto no contrato e mandou recalcular o débito, reconhecendo que o credor não pode transformar a purgação em obstáculo econômico. É o precedente que sustenta a nossa impugnação de encargos.",
          itens: [
            "Honorários acima do contratado foram reduzidos.",
            "Purgação não pode ser inviabilizada por encargos excessivos.",
            "Recálculo determinado com base estrita no contrato.",
          ],
        },
        fortalecer: {
          resumo:
            "Use este acórdão como espinha dorsal da impugnação ao cálculo. Ele legitima a comparação linha por linha entre o que o contrato autoriza e o que o banco cobrou. Apresente essa comparação em tabela simples, apontando o excesso em cada rubrica e o total resultante.",
          itens: [
            "Compare rubrica por rubrica com a cláusula contratual.",
            "Aponte o total do excesso em número fechado.",
            "Peça expressamente o recálculo, não a mera redução genérica.",
          ],
        },
        blindar: {
          resumo:
            "O banco vai argumentar que os honorários decorrem da propositura da ação e são devidos. Deixe claro que a discussão não é o cabimento, mas o percentual acima do contratado. Essa distinção evita que a impugnação seja rejeitada por parecer um pedido de isenção de honorários.",
          itens: [
            "Diferencie cabimento de honorários e excesso no percentual.",
            "Não peça isenção total, peça adequação ao contrato.",
            "Junte a cláusula específica de honorários do contrato.",
          ],
        },
        contrapor: {
          resumo:
            "A fragilidade do precedente é a origem: vem da 17ª Câmara e está baixado, então a defesa dirá que não vincula a 18ª. Responda que a matéria é de interpretação contratual e que a nossa própria câmara já determinou recálculo neste processo em agosto de 2026 — precedente interno vale mais que discussão de competência.",
          itens: [
            "É precedente de outra câmara, já baixado.",
            "Reforce com a decisão de recálculo já proferida neste processo.",
            "Trate o tema como interpretação contratual, não como tese.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "18ª Câmara Cível", orientacao: "Rejeita adimplemento substancial", versus: "against", nota: "Nossa câmara. Ir pela purgação." },
      { camara: "17ª Câmara Cível", orientacao: "Reduz encargos excessivos na purgação", versus: "for", nota: "Base da impugnação de cálculo." },
    ],
    jurimetria: {
      amostra: 19,
      padrao: "Adimplemento substancial é rejeitado em 10 de 19 casos. Purgação com impugnação de encargos tem êxito parcial em quase todos.",
      interno: "O escritório nunca venceu pelo adimplemento substancial, mas sempre reduziu encargos.",
      riscos: ["Valor da purgação inflado pelo banco", "Tese principal com histórico ruim na câmara"],
    },
  },
  {
    id: "pix",
    titulo: "Fraude por Pix e falso gerente",
    tema: "fraude eletrônica · Pix · falha na segurança",
    subtema: "Fraude eletrônica",
    processNumber: "9000054-78.2026.8.16.0000",
    court: "TJPR",
    chamber: "10ª Câmara Cível",
    status: "DISTRIBUIDO",
    cliente: "Cerâmica Rio Claro Ltda.",
    partes: [
      { papel: "Autora", nome: "Cerâmica Rio Claro Ltda." },
      { papel: "Réu", nome: "Banco Meridiano S.A." },
    ],
    resumo:
      "Golpista se passou por gerente, obteve acesso ao internet banking da empresa e fez seis Pix em 20 minutos.",
    tese: "Falha na segurança do serviço bancário gera responsabilidade objetiva pelo risco da atividade.",
    atualizacao: "Distribuído há 4 dias, aguardando análise da tutela",
    chance: 76,
    chanceRotulo: "Forte",
    chanceTexto:
      "A 10ª aplica a Súmula 479 do STJ com firmeza. O ponto sensível é a alegação de culpa exclusiva da vítima.",
    votos: { for: 17, against: 4, diverge: 3 },
    peticoes: [
      doc("p1", "Petição inicial com tutela", "Peça", "08/09/2026", "Acervo interno", "Pede ressarcimento dos valores e bloqueio das contas de destino."),
      doc("p2", "Pedido de exibição de logs", "Peça", "08/09/2026", "Acervo interno", "Requer os registros de acesso e dispositivos usados nas transações."),
    ],
    contratos: [
      doc("c1", "Contrato de conta empresarial", "Contrato", "2020", "Cliente", "Prevê limites de transação e sistema de segurança do banco."),
      doc("c2", "Termo de adesão ao internet banking", "Contrato", "2020", "Cliente", "Define autenticação em dois fatores como padrão."),
    ],
    documentos: [
      doc("d1", "Comprovantes dos seis Pix", "Cliente", "2026", "Cliente", "Total de R$ 84.300 em 20 minutos."),
      doc("d2", "Gravação da ligação do falso gerente", "Cliente", "2026", "Cliente", "Áudio em que o golpista se identifica como funcionário."),
      doc("d3", "Boletim de ocorrência", "Cliente", "2026", "Cliente", "Registro feito no mesmo dia do golpe."),
      doc("d4", "Histórico de movimentação da conta", "Cliente", "2026", "Cliente", "Mostra que o padrão de uso era incompatível com as transferências."),
      doc("d5", "Protocolo de contestação no banco", "Cliente", "2026", "Cliente", "Reclamação administrativa negada em 48 horas."),
    ],
    decisoes: [],
    modelos: [
      doc("m1", "Modelo de ação por fraude eletrônica", "Modelo", "2025", "Biblioteca", "Peça-base com pedido de exibição de logs."),
      doc("m2", "Parecer sobre Súmula 479 do STJ", "Parecer", "2025", "Biblioteca", "Como o TJPR aplica a responsabilidade objetiva."),
      doc("m3", "Roteiro de urgência em golpe do Pix", "Modelo", "2026", "Biblioteca", "Primeiras 24 horas: MED, BO e contestação formal."),
    ],
    historico: [
      { data: "08/09/2026", titulo: "Distribuição", detalhe: "10ª Câmara Cível do TJPR, com pedido de tutela." },
      { data: "02/09/2026", titulo: "Contestação negada", detalhe: "Banco recusou o ressarcimento administrativo." },
      { data: "29/08/2026", titulo: "Golpe", detalhe: "Seis transferências Pix em 20 minutos." },
    ],
    teses: [
      { id: "t1", titulo: "Responsabilidade objetiva pelo risco", uso: "Pedido principal.", forca: "alta" },
      { id: "t2", titulo: "Falha no monitoramento de transações atípicas", uso: "Fundamento técnico.", forca: "alta" },
      { id: "t3", titulo: "Dano material integral", uso: "Quantificação do pedido.", forca: "media" },
    ],
    resultados: [
      { id: "r1", titulo: "Caso Cerâmica Sul · 2025", desfecho: "Ressarcimento integral em tutela.", aprendizado: "O histórico de movimentação da conta foi o documento decisivo." },
      { id: "r2", titulo: "Caso Delta Comércio · 2025", desfecho: "Acordo por 80% do valor.", aprendizado: "Pedir os logs cedo pressiona o banco a negociar." },
    ],
    conversas: [
      { id: "cv1", autora: "Gustavo Vilela", papel: "Advogado", hora: "18:30", texto: "A tutela só voa se o histórico de movimentação mostrar que aquilo era atípico." },
      { id: "cv2", autora: "Memória", papel: "IA do caso", hora: "18:31", texto: "Encontrei 2 casos internos com o mesmo padrão de transação atípica. Ambos com tutela deferida.", ia: true },
      { id: "cv3", autora: "João Lima", papel: "Estagiário", hora: "18:52", texto: "@Gustavo Vilela já anexei o histórico de 12 meses e o áudio da ligação." },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000042-35.2024.8.16.0000",
        acordao: "Acórdão 220.019",
        court: "TJPR",
        chamber: "10ª Câmara Cível",
        reporter: "Des. Lúcia Ferraz",
        date: "12/03/2025",
        status: "ATIVO",
        alignment: "for",
        ementa: "Fraude em transações eletrônicas. Fortuito interno. Responsabilidade do banco.",
        pontos: ["Súmula 479 do STJ", "Fortuito interno", "Transação atípica"],
        essencial: {
          resumo:
            "A Câmara tratou a fraude eletrônica como fortuito interno, ou seja, risco inerente à atividade bancária, aplicando a Súmula 479 do STJ. O que pesou de forma decisiva foi a existência de transações completamente fora do padrão histórico da conta, sem que o sistema de monitoramento do banco tenha barrado ou sequer sinalizado. O ressarcimento foi integral.",
          itens: [
            "Fraude eletrônica é fortuito interno, não excludente.",
            "Falta de bloqueio de transação atípica caracteriza falha do serviço.",
            "Ressarcimento integral dos valores transferidos.",
          ],
        },
        fortalecer: {
          resumo:
            "O centro de gravidade desse precedente é a atipicidade. Prove que a conta nunca movimentou aquele volume naquele intervalo e que o banco tinha meios de perceber. Junte o histórico de doze meses e, ao lado, a sequência dos seis Pix. O contraste faz o argumento sozinho.",
          itens: [
            "Anexe o histórico de 12 meses ao lado da sequência do golpe.",
            "Peça os logs de acesso e o dispositivo usado nas transações.",
            "Aponte que o sistema não gerou nenhum alerta ou bloqueio.",
          ],
        },
        blindar: {
          resumo:
            "A defesa clássica é culpa exclusiva da vítima, sustentando que o cliente entregou a senha. Blinde-se mostrando que houve engenharia social qualificada com uso do nome e do roteiro do banco, e que a autenticação em dois fatores não impediu nada. O foco desloca da conduta do cliente para a falha do sistema.",
          itens: [
            "Junte a gravação em que o golpista usa o roteiro do banco.",
            "Sustente que o segundo fator de autenticação falhou.",
            "Mostre que a contestação administrativa foi negada sem análise técnica.",
          ],
        },
        contrapor: {
          resumo:
            "O limite desse precedente aparece quando o cliente é empresa com equipe financeira própria: alguns julgados exigem dever de diligência reforçado nesse cenário. Prepare a resposta demonstrando que a fraude atingiu o sistema do banco e que o porte da cliente não transfere o risco da atividade bancária.",
          itens: [
            "A defesa vai invocar dever de diligência reforçado da empresa.",
            "Responda que o risco da atividade não se transfere pelo porte do cliente.",
            "Se citarem culpa concorrente, sustente ao menos a repartição do prejuízo.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000041-84.2023.8.16.0000",
        acordao: "Acórdão 205.670",
        court: "TJPR",
        chamber: "12ª Câmara Cível",
        reporter: "Des. Renata Mello",
        date: "28/09/2024",
        status: "CANCELADO",
        alignment: "against",
        ementa: "Culpa exclusiva da vítima. Senha fornecida voluntariamente. Improcedência.",
        pontos: ["Culpa exclusiva da vítima", "Senha entregue pelo cliente"],
        essencial: {
          resumo:
            "Aqui a Câmara concluiu que o cliente forneceu senha e token voluntariamente após contato telefônico, o que caracterizou culpa exclusiva da vítima e rompeu o nexo causal. O banco foi absolvido porque o sistema funcionou como devia: as transações passaram por autenticação válida. É o precedente mais perigoso para o nosso caso.",
          itens: [
            "Entrega voluntária de senha e token rompeu o nexo causal.",
            "Autenticação válida afastou a falha do serviço.",
            "Culpa exclusiva da vítima como excludente reconhecida.",
          ],
        },
        fortalecer: {
          resumo:
            "Esse julgado indica exatamente onde a sua narrativa precisa ser precisa. Não descreva o episódio como entrega de senha, e sim como invasão viabilizada por falha de monitoramento. Sustente que a autenticação formalmente válida não supre o dever de barrar movimentação incompatível com o histórico da conta.",
          itens: [
            "Descreva o fato como falha de monitoramento, não entrega de senha.",
            "Sustente que autenticação válida não afasta o dever de bloqueio.",
            "Insista nos logs para demonstrar acesso por dispositivo estranho.",
          ],
        },
        blindar: {
          resumo:
            "Se a inicial der margem para leitura de que o representante da empresa passou dados, esse precedente pode encerrar o caso. Escreva a narrativa dos fatos com cuidado cirúrgico e produza desde já a prova do dispositivo usado, para que a discussão fique no terreno técnico e não no comportamento do funcionário.",
          itens: [
            "Revise a narrativa dos fatos para evitar admissão implícita.",
            "Requeira os logs antes de qualquer discussão sobre conduta.",
            "Cite o acórdão 220.019 da nossa câmara como contraponto imediato.",
          ],
        },
        contrapor: {
          resumo:
            "Para afastar o precedente, mostre duas diferenças concretas: lá as transações eram compatíveis com o perfil da conta e não havia gravação da abordagem fraudulenta. Aqui existe áudio do golpista e um salto brutal de movimentação. Fatos diferentes, conclusão diferente.",
          itens: [
            "Lá as transações eram compatíveis com o perfil; aqui não.",
            "Existe gravação da abordagem, o que não havia no precedente.",
            "Julgado de outra câmara e com registro cancelado.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "10ª Câmara Cível", orientacao: "Aplica a Súmula 479 com firmeza", versus: "for", nota: "Nossa câmara." },
      { camara: "12ª Câmara Cível", orientacao: "Admite culpa exclusiva da vítima", versus: "against", nota: "Cuidar da narrativa dos fatos." },
    ],
    jurimetria: {
      amostra: 24,
      padrao: "Com prova de transação atípica, o êxito chega a 17 de 24 casos.",
      interno: "2 casos idênticos do escritório terminaram com ressarcimento integral.",
      riscos: ["Tese de culpa exclusiva da vítima", "Cliente empresarial atrai dever de diligência reforçado"],
    },
  },
  {
    id: "rural",
    titulo: "Cédula rural e seguro prestamista",
    tema: "crédito rural · seguro prestamista · venda casada",
    subtema: "Crédito rural",
    processNumber: "9000030-80.2022.8.16.0003",
    court: "TJPR",
    chamber: "13ª Câmara Cível",
    status: "TRANSITADO_EM_JULGADO",
    cliente: "Fazenda Santa Fé Agropecuária",
    partes: [
      { papel: "Autora", nome: "Fazenda Santa Fé Agropecuária" },
      { papel: "Réu", nome: "Banco Horizonte S.A." },
    ],
    resumo:
      "Cédula de crédito rural com seguro prestamista embutido e cobrança de tarifa de avaliação de safra.",
    tese: "Seguro prestamista imposto na operação de crédito rural configura venda casada.",
    atualizacao: "Trânsito em julgado, caso encerrado com êxito",
    chance: 79,
    chanceRotulo: "Encerrado com êxito",
    chanceTexto:
      "Caso já finalizado. Fica na memória como referência para as próximas cédulas rurais com prestamista embutido.",
    votos: { for: 14, against: 3, diverge: 2 },
    peticoes: [
      doc("p1", "Petição inicial", "Peça", "03/03/2022", "Acervo interno", "Nulidade do seguro embutido e devolução da tarifa de avaliação."),
      doc("p2", "Réplica", "Peça", "12/05/2022", "Acervo interno", "Enfrenta a alegação de contratação facultativa do seguro."),
      doc("p3", "Contrarrazões de apelação", "Peça", "10/08/2024", "Acervo interno", "Sustentou a sentença favorável em segundo grau."),
    ],
    contratos: [
      doc("c1", "Cédula de crédito rural nº 12.774", "Contrato", "2020", "Cliente", "Operação de custeio de safra com garantia de penhor."),
      doc("c2", "Apólice do seguro prestamista", "Contrato", "2020", "Banco", "Emitida no mesmo ato, sem proposta autônoma."),
      doc("c3", "Termo de avaliação da safra", "Contrato", "2020", "Banco", "Serviço cobrado sem relatório correspondente."),
    ],
    documentos: [
      doc("d1", "Comprovantes de liberação e pagamento", "Cliente", "2022", "Cliente", "Fluxo financeiro completo da operação."),
      doc("d2", "Notas fiscais de insumos", "Cliente", "2022", "Cliente", "Comprovam a destinação do crédito rural."),
      doc("d3", "Pedido de relatório de avaliação", "Trabalho interno", "2022", "Equipe", "Solicitação sem resposta do banco."),
    ],
    decisoes: [
      doc("de1", "Sentença de procedência parcial", "Sentença", "18/11/2023", "TJPR", "Seguro anulado, tarifa de avaliação devolvida, juros mantidos."),
      doc("de2", "Acórdão de manutenção", "Acórdão", "18/11/2024", "TJPR", "Negou provimento à apelação do banco."),
      doc("de3", "Certidão de trânsito em julgado", "Certidão", "09/01/2025", "TJPR", "Encerramento definitivo do processo."),
    ],
    modelos: [
      doc("m1", "Modelo de revisional de cédula rural", "Modelo", "2022", "Biblioteca", "Peça-base com foco em seguro embutido."),
      doc("m2", "Parecer sobre venda casada em crédito rural", "Parecer", "2023", "Biblioteca", "Consolidação da tese com base neste caso."),
      doc("m3", "Modelo de contrarrazões em revisional", "Modelo", "2024", "Biblioteca", "Estrutura que sustentou a sentença aqui."),
    ],
    historico: [
      { data: "09/01/2025", titulo: "Trânsito em julgado", detalhe: "Sem recurso do banco." },
      { data: "18/11/2024", titulo: "Acórdão", detalhe: "Sentença mantida integralmente." },
      { data: "18/11/2023", titulo: "Sentença", detalhe: "Procedência parcial favorável à cliente." },
      { data: "03/03/2022", titulo: "Distribuição", detalhe: "13ª Câmara Cível do TJPR." },
    ],
    teses: [
      { id: "t1", titulo: "Venda casada de prestamista", uso: "Pedido principal, acolhido.", forca: "alta" },
      { id: "t2", titulo: "Tarifa sem relatório de serviço", uso: "Pedido de devolução, acolhido.", forca: "alta" },
      { id: "t3", titulo: "Revisão de juros rurais", uso: "Pedido rejeitado.", forca: "baixa" },
    ],
    resultados: [
      { id: "r1", titulo: "Este caso", desfecho: "Seguro anulado e tarifa devolvida, com trânsito em julgado.", aprendizado: "A ausência de proposta autônoma do seguro foi o argumento que venceu." },
      { id: "r2", titulo: "Reuso da tese", desfecho: "Peça aproveitada em dois novos clientes rurais.", aprendizado: "O modelo derivado deste caso já está indexado na biblioteca." },
    ],
    conversas: [
      { id: "cv1", autora: "João Lima", papel: "Estagiário", hora: "17:10", texto: "Já indexei o acórdão na biblioteca de teses do escritório." },
      { id: "cv2", autora: "Ana Prado", papel: "Sócia", hora: "17:22", texto: "@João Lima ótimo. Esse é o caso que a gente cita nas próximas cédulas rurais." },
    ],
    jurisprudencias: [
      {
        id: "j1",
        processNumber: "9000035-48.2021.8.16.0000",
        acordao: "Acórdão 180.552",
        court: "TJPR",
        chamber: "13ª Câmara Cível",
        reporter: "Des. Helena Vargas",
        date: "06/07/2023",
        status: "TRANSITADO_EM_JULGADO",
        alignment: "for",
        ementa: "Seguro prestamista sem proposta autônoma. Venda casada configurada. Devolução determinada.",
        pontos: ["Sem proposta autônoma", "Venda casada", "Devolução integral"],
        essencial: {
          resumo:
            "A Câmara considerou que oferecer seguro prestamista na mesma assinatura da cédula de crédito, sem proposta separada e sem alternativa de seguradora, elimina a liberdade de escolha do contratante. O prêmio pago foi devolvido integralmente. A tese vale para crédito rural e para operações bancárias comuns, o que amplia bastante o reaproveitamento.",
          itens: [
            "Ausência de proposta autônoma caracteriza imposição.",
            "Falta de alternativa de seguradora reforça a venda casada.",
            "Devolução integral do prêmio pago.",
          ],
        },
        fortalecer: {
          resumo:
            "O argumento vence pela ausência de um documento, e não pela presença dele. Peça que o banco exiba a proposta autônoma do seguro e a comprovação de que houve escolha de seguradora. Quando isso não existe — e normalmente não existe — o pedido se resolve praticamente sozinho.",
          itens: [
            "Requeira a exibição da proposta autônoma do seguro.",
            "Peça prova de que houve opção de seguradora.",
            "Mostre que a apólice tem a mesma data e assinatura da cédula.",
          ],
        },
        blindar: {
          resumo:
            "A defesa vai sustentar que o seguro era facultativo e beneficiava o próprio produtor. Antecipe que facultatividade se prova com documento, não com afirmação, e que a coincidência de data e assinatura demonstra o contrário. Assim o ônus volta para o banco antes de a tese dele se firmar.",
          itens: [
            "Facultatividade se prova com proposta separada, não com alegação.",
            "Aponte a coincidência de data entre cédula e apólice.",
            "Registre que não houve informação sobre o custo do prêmio.",
          ],
        },
        contrapor: {
          resumo:
            "O ponto que a outra parte pode explorar é o benefício real do seguro em caso de sinistro, sobretudo em crédito rural com risco climático. Se isso vier, responda que a utilidade eventual do produto não legitima a forma de contratação — o vício está no modo de oferta, não na natureza do seguro.",
          itens: [
            "Utilidade do seguro não legitima a imposição na contratação.",
            "O vício está na forma de oferta, não no produto.",
            "Se alegarem sinistro coberto, isso não afasta a devolução do prêmio.",
          ],
        },
      },
      {
        id: "j2",
        processNumber: "9000048-81.2020.8.16.0000",
        acordao: "Acórdão 169.318",
        court: "TJPR",
        chamber: "15ª Câmara Cível",
        reporter: "Des. Paulo Freire",
        date: "25/02/2022",
        status: "ARQUIVADO_DEFINITIVAMENTE",
        alignment: "against",
        ementa: "Seguro assinado em termo próprio. Contratação válida. Improcedência.",
        pontos: ["Termo próprio assinado", "Contratação válida"],
        essencial: {
          resumo:
            "Neste julgado o seguro foi considerado validamente contratado porque havia termo próprio, assinado em documento separado, com indicação do prêmio e da seguradora. A Câmara concluiu que existia informação suficiente e liberdade de escolha. É o cenário oposto ao nosso e serve de contraste útil.",
          itens: [
            "Termo separado com prêmio e seguradora indicados.",
            "Informação considerada adequada e suficiente.",
            "Liberdade de escolha reconhecida pela Câmara.",
          ],
        },
        fortalecer: {
          resumo:
            "Use este acórdão como espelho. Ele define com precisão o padrão de documentação que valida o seguro, e é justamente esse padrão que falta no nosso contrato. Colocar os dois cenários lado a lado torna o argumento visual e reduz a discussão a uma comparação de documentos.",
          itens: [
            "Compare o padrão exigido lá com o que existe no nosso contrato.",
            "Liste o que falta: termo separado, prêmio destacado, escolha de seguradora.",
            "Use a comparação como quadro na petição.",
          ],
        },
        blindar: {
          resumo:
            "Se o banco conseguir produzir algum documento parecido com termo próprio, a discussão muda de patamar. Blinde-se pedindo, desde a inicial, a exibição de todos os documentos da operação, para que nada apareça depois de forma seletiva ou reconstituída.",
          itens: [
            "Peça a exibição integral do dossiê da operação na inicial.",
            "Registre que juntada posterior e seletiva não convalida a oferta.",
            "Aponte a ausência de destaque do prêmio no contrato atual.",
          ],
        },
        contrapor: {
          resumo:
            "Para neutralizar, a diferença é documental e objetiva: lá havia termo autônomo com prêmio destacado, aqui a apólice nasceu junto com a cédula. Some a isso que o precedente é da 15ª Câmara e já está arquivado, enquanto a nossa 13ª tem orientação firme em sentido contrário.",
          itens: [
            "Lá havia termo autônomo; aqui a apólice é do mesmo ato.",
            "Precedente da 15ª Câmara, arquivado definitivamente.",
            "A 13ª tem orientação firme em sentido oposto.",
          ],
        },
      },
    ],
    dissidios: [
      { camara: "13ª Câmara Cível", orientacao: "Anula prestamista sem proposta autônoma", versus: "for", nota: "Nossa câmara, orientação firme." },
      { camara: "15ª Câmara Cível", orientacao: "Valida seguro com termo próprio", versus: "against", nota: "Só se aplica quando há documento separado." },
    ],
    jurimetria: {
      amostra: 19,
      padrao: "Sem proposta autônoma, a venda casada é reconhecida em 14 de 19 julgados.",
      interno: "Caso encerrado. A tese já foi reaproveitada em dois novos clientes rurais.",
      riscos: [],
    },
  },
];

export const CASOS: Caso[] = CASOS_BRUTOS.map((caso) =>
  aplicarPoliticaAntiAlucinacao(hidratarPrazos({ ...caso, prazos: caso.prazos ?? [] }))
);

export function buscarCaso(id: string) {
  return CASOS.find((caso) => caso.id === id);
}
