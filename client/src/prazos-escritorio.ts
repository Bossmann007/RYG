import { Caso, FonteFato, Prazo, PrazoStatus } from "./tipos";

type Dono = { nome: string };

const DONOS: Dono[] = [
  { nome: "Gustavo Vilela" },
  { nome: "Ana Prado" },
  { nome: "Marina Costa" },
  { nome: "João Lima" },
];

function semente(texto: string): number {
  let n = 0;
  for (let i = 0; i < texto.length; i += 1) {
    n = (n * 33 + texto.charCodeAt(i)) >>> 0;
  }
  return n;
}

function donoDe(casoId: string, indice: number): string {
  return DONOS[(semente(casoId) + indice) % DONOS.length].nome;
}

function prazo(entrada: Omit<Prazo, "id"> & { id: string }): Prazo {
  return entrada;
}

function prazosTarifas(): Prazo[] {
  return [
    prazo({
      id: "prz-tarifas-alegacoes",
      title: "Alegações finais",
      kind: "manifestacao",
      dueAt: "2026-09-16",
      startedAt: "2026-08-28",
      days: 15,
      calendar: "uteis",
      status: "a_vencer",
      owner: "Marina Costa",
      trigger: "Despacho de 28/08/2026 abrindo prazo comum.",
      gatilhoFonte: "acervo_interno",
      notes: "Fechar em três capítulos: informação, contraprestação e devolução.",
    }),
    prazo({
      id: "prz-tarifas-revisao",
      title: "Revisão interna da peça",
      kind: "interno",
      dueAt: "2026-09-15",
      startedAt: "2026-09-10",
      days: 3,
      calendar: "uteis",
      status: "a_vencer",
      owner: "Ana Prado",
      trigger: "Controle do escritório, antes do protocolo.",
      gatilhoFonte: "acervo_interno",
    }),
    prazo({
      id: "prz-tarifas-contestacao",
      title: "Ler contestação e mapear teses",
      kind: "interno",
      dueAt: "2026-09-08",
      startedAt: "2026-09-11",
      days: 5,
      calendar: "corridos",
      status: "vencido",
      owner: "João Lima",
      trigger: "Contestação juntada em 11/09/2026.",
      gatilhoFonte: "acervo_interno",
      notes: "O banco tentou afastar o CDC. Anotar os parágrafos para a réplica.",
    }),
    prazo({
      id: "prz-tarifas-planilha",
      title: "Atualizar planilha de recálculo",
      kind: "prova",
      dueAt: "2026-09-22",
      days: 7,
      calendar: "uteis",
      status: "aberto",
      owner: "João Lima",
      trigger: "Pedido interno após a perícia deferida.",
      gatilhoFonte: "acervo_interno",
    }),
    prazo({
      id: "prz-tarifas-replica",
      title: "Réplica à contestação",
      kind: "manifestacao",
      dueAt: "2024-06-02",
      startedAt: "2024-05-18",
      days: 15,
      calendar: "uteis",
      status: "cumprido",
      owner: "Marina Costa",
      trigger: "Intimação da contestação.",
      gatilhoFonte: "acervo_interno",
    }),
  ];
}

function prazosGenericos(caso: Pick<Caso, "id" | "historico" | "decisoes" | "status">): Prazo[] {
  const dono0 = donoDe(caso.id, 0);
  const dono1 = donoDe(caso.id, 1);
  const dono2 = donoDe(caso.id, 2);
  const offset = semente(caso.id) % 4;
  const ultimo = caso.historico[0];
  const gatilho = ultimo
    ? `${ultimo.titulo} em ${ultimo.data}.`
    : "Controle interno do caso.";
  const gatilhoFonte: FonteFato = ultimo ? "acervo_interno" : "acervo_interno";

  const itens: Prazo[] = [
    prazo({
      id: `prz-${caso.id}-peca`,
      title: "Próxima manifestação do caso",
      kind: "manifestacao",
      dueAt: isoDeslocado(16 + offset),
      days: 15,
      calendar: "uteis",
      status: caso.status === "SUSPENSO" ? "suspenso" : "a_vencer",
      owner: dono0,
      trigger: gatilho,
      gatilhoFonte,
      notes: "Vencimento lançado no acervo. DataJud só registrou o andamento, se houver.",
    }),
    prazo({
      id: `prz-${caso.id}-revisao`,
      title: "Revisão interna antes de protocolar",
      kind: "interno",
      dueAt: isoDeslocado(14 + (offset % 2)),
      days: 3,
      calendar: "uteis",
      status: "a_vencer",
      owner: dono1,
      trigger: "Rotina do escritório.",
      gatilhoFonte: "acervo_interno",
    }),
    prazo({
      id: `prz-${caso.id}-prova`,
      title: caso.decisoes[0]
        ? `Providenciar prova após ${caso.decisoes[0].titulo.toLowerCase()}`
        : "Completar pasta de prova",
      kind: "prova",
      dueAt: isoDeslocado(22 + offset),
      days: 10,
      calendar: "uteis",
      status: "aberto",
      owner: dono2,
      trigger: caso.decisoes[0]
        ? `${caso.decisoes[0].titulo} · ${caso.decisoes[0].data}`
        : "Checklist interno.",
      gatilhoFonte: "acervo_interno",
    }),
    prazo({
      id: `prz-${caso.id}-lido`,
      title: "Confirmar ciência no sistema do tribunal",
      kind: "interno",
      dueAt: isoDeslocado(8),
      days: 2,
      calendar: "corridos",
      status: "vencido",
      owner: dono2,
      trigger: "Controle de intimação do escritório.",
      gatilhoFonte: "acervo_interno",
    }),
    prazo({
      id: `prz-${caso.id}-feito`,
      title: "Peça anterior protocolada",
      kind: "manifestacao",
      dueAt: "2026-09-05",
      days: 15,
      calendar: "uteis",
      status: "cumprido",
      owner: dono0,
      trigger: "Protocolo registrado no acervo.",
      gatilhoFonte: "acervo_interno",
    }),
  ];

  if (caso.status === "SUSPENSO") {
    itens[0].status = "suspenso";
  }

  return itens;
}

function isoDeslocado(dia: number): string {
  const mes = dia > 30 ? 10 : 9;
  const d = dia > 30 ? dia - 30 : dia;
  return `2026-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function prazosDoEscritorio(
  caso: Pick<Caso, "id" | "historico" | "decisoes" | "status">
): Prazo[] {
  if (caso.id === "tarifas") {
    return prazosTarifas();
  }

  return prazosGenericos(caso);
}

export function hidratarPrazos<T extends Pick<Caso, "id" | "historico" | "decisoes" | "status" | "prazos">>(
  caso: T
): T {
  if (Array.isArray(caso.prazos)) {
    return caso;
  }

  return { ...caso, prazos: prazosDoEscritorio(caso) };
}

export function diasRestantes(dueAt: string, hoje = "2026-09-13"): number {
  const a = Date.parse(`${dueAt}T12:00:00`);
  const b = Date.parse(`${hoje}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return 0;
  }

  return Math.round((a - b) / 86400000);
}

export function urgenciaDe(prazo: Prazo): PrazoStatus {
  if (prazo.status === "cumprido" || prazo.status === "suspenso") {
    return prazo.status;
  }

  const dias = diasRestantes(prazo.dueAt);
  if (dias < 0) {
    return "vencido";
  }

  if (dias <= 5) {
    return "a_vencer";
  }

  return "aberto";
}

export function formatarDataIso(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) {
    return iso;
  }

  return `${dia}/${mes}/${ano}`;
}
