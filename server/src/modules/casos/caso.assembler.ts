import { aplicarPoliticaCaso } from "@common/security/caso-policy";
import { sanitizeUntrustedText } from "@common/security/untrusted-text";
import {
  Alinhamento,
  BlocoAnalise,
  CAMPOS_CASO,
  Caso,
  Dissidio,
  Documento,
  ForcaTese,
  Jurisprudencia,
  Jurimetria,
  Mensagem,
  ParteProcesso,
  Prazo,
  PrazoCalendario,
  PrazoKind,
  PrazoStatus,
  ResultadoInterno,
  STATUS_PROCESSO,
  StatusProcesso,
  Tese,
  FonteFato,
} from "@models/caso.model";
import { ALIASES } from "./schema-map";

export type Linha = Record<string, unknown>;

export type PacoteCaso = {
  capa: Linha;
  processo?: Linha;
  cliente?: Linha;
  clientes?: Linha[];
  peticoes: Linha[];
  contratos: Linha[];
  documentos: Linha[];
  decisoes: Linha[];
  modelos: Linha[];
  historico: Linha[];
  prazos?: Linha[];
  teses: Linha[];
  resultados: Linha[];
  conversas: Linha[];
  jurisprudencias: Linha[];
  dissidios: Linha[];
  jurimetria?: Linha;
};

const STATUS_SET = new Set<string>(STATUS_PROCESSO);

const STATUS_APELIDO: Record<string, StatusProcesso> = {
  distribuido: "DISTRIBUIDO",
  ativo: "ATIVO",
  concluso: "CONCLUSO",
  "aguardando manifestacao": "AGUARDANDO_MANIFESTACAO",
  suspenso: "SUSPENSO",
  "em recurso": "EM_RECURSO",
  sentenciado: "SENTENCIADO",
  "transitado em julgado": "TRANSITADO_EM_JULGADO",
  "em execucao": "EM_EXECUCAO",
  "arquivo provisorio": "ARQUIVADO_PROVISORIAMENTE",
  "arquivo definitivo": "ARQUIVADO_DEFINITIVAMENTE",
  baixado: "BAIXADO",
  extinto: "EXTINTO",
  inativo: "INATIVO",
  cancelado: "CANCELADO",
};

const BLOCO_VAZIO: BlocoAnalise = { resumo: "", itens: [] };

export function valorCampo(linha: Linha | undefined, aliases: readonly string[]): unknown {
  if (!linha) {
    return undefined;
  }

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(linha, alias) && linha[alias] != null) {
      return desempacotar(linha[alias]);
    }
  }

  const baixo = Object.fromEntries(
    Object.entries(linha).map(([chave, valor]) => [chave.toLowerCase(), valor])
  );

  for (const alias of aliases) {
    const valor = baixo[alias.toLowerCase()];
    if (valor != null) {
      return desempacotar(valor);
    }
  }

  return undefined;
}

export function textoCampo(
  linha: Linha | undefined,
  aliases: readonly string[],
  padrao = ""
): string {
  const valor = valorCampo(linha, aliases);

  if (valor == null) {
    return padrao;
  }

  if (valor instanceof Date) {
    return valor.toLocaleDateString("pt-BR");
  }

  return sanitizeUntrustedText(String(valor).trim());
}

export function cnjDigitos(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function formatarCnj(valor: unknown): string {
  const digitos = cnjDigitos(valor);
  if (digitos.length !== 20) {
    return String(valor ?? "").trim();
  }

  return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16, 20)}`;
}

export function mesmoCaso(caso: Caso, idOrCnj: string): boolean {
  const chave = idOrCnj.trim();
  if (!chave) {
    return false;
  }

  if (caso.id === chave || caso.processNumber === chave) {
    return true;
  }

  const digitos = cnjDigitos(chave);
  return digitos.length === 20 && cnjDigitos(caso.processNumber) === digitos;
}

export function montarCaso(pacote: PacoteCaso): Caso {
  const base = casoDePayload(valorCampo(pacote.capa, ALIASES.payload));
  const capa = mesclarLinhas(pacote.processo, pacote.capa);
  const clienteNome =
    textoCampo(pacote.capa, ALIASES.cliente) ||
    textoCampo(pacote.cliente, ALIASES.cliente) ||
    base.cliente;
  const partes = partesDe(capa, pacote.clientes || [], base.partes, clienteNome);
  const id =
    textoCampo(pacote.capa, ALIASES.id) ||
    textoCampo(pacote.processo, ALIASES.numeroCnj) ||
    base.id;

  return aplicarPoliticaCaso({
    id,
    processoId: textoCampo(pacote.processo, ALIASES.id),
    titulo:
      textoCampo(capa, ALIASES.titulo) ||
      textoCampo(pacote.processo, ["classe_nome"]) ||
      base.titulo,
    tema: textoCampo(capa, ALIASES.tema, base.tema),
    subtema: textoCampo(capa, ALIASES.subtema, base.subtema),
    processNumber: formatarCnj(
      textoCampo(capa, ALIASES.numeroCnj) ||
        textoCampo(pacote.processo, ALIASES.numeroCnj) ||
        base.processNumber
    ),
    court: textoCampo(capa, ALIASES.court, base.court),
    chamber:
      textoCampo(capa, ALIASES.chamber) ||
      textoCampo(pacote.processo, ALIASES.chamber) ||
      base.chamber,
    status: statusDe(valorCampo(capa, ALIASES.status) ?? base.status),
    cliente: clienteNome,
    partes,
    resumo: textoCampo(capa, ALIASES.resumo, base.resumo),
    tese: textoCampo(capa, ALIASES.tese, base.tese),
    atualizacao: textoCampo(capa, ALIASES.atualizacao, base.atualizacao),
    chance: numeroDe(valorCampo(capa, ALIASES.chance), base.chance),
    chanceRotulo: textoCampo(capa, ALIASES.chanceRotulo, base.chanceRotulo),
    chanceTexto: textoCampo(capa, ALIASES.chanceTexto, base.chanceTexto),
    votos: votosDe(capa, base.votos),
    peticoes: documentosDe(pacote.peticoes, base.peticoes, "pet", "Peça"),
    contratos: documentosDe(pacote.contratos, base.contratos, "ctr", "Contrato"),
    documentos: documentosDe(pacote.documentos, base.documentos, "doc", "Documento"),
    decisoes: documentosDe(pacote.decisoes, base.decisoes, "dec", "Decisão"),
    modelos: documentosDe(pacote.modelos, base.modelos, "mod", "Modelo"),
    historico: andamentosDe(pacote.historico, base.historico),
    prazos: prazosDe(pacote.prazos || [], base.prazos),
    teses: tesesDe(pacote.teses, base.teses),
    resultados: resultadosDe(pacote.resultados, base.resultados),
    conversas: conversasDe(pacote.conversas, base.conversas),
    jurisprudencias: jurisprudenciasDe(pacote.jurisprudencias, base.jurisprudencias),
    dissidios: dissidiosDe(pacote.dissidios, base.dissidios),
    jurimetria: jurimetriaDe(pacote.jurimetria, capa, base.jurimetria),
    fontes: base.fontes,
  });
}

function desempacotar(valor: unknown): unknown {
  if (Buffer.isBuffer(valor)) {
    return valor.toString("utf8");
  }

  return valor;
}

function jsonDe(valor: unknown): unknown {
  const cru = desempacotar(valor);

  if (typeof cru !== "string") {
    return cru;
  }

  const texto = cru.trim();
  if (!texto || (texto[0] !== "{" && texto[0] !== "[")) {
    return cru;
  }

  try {
    return JSON.parse(texto);
  } catch {
    return cru;
  }
}

function casoDePayload(valor: unknown): Caso {
  const json = jsonDe(valor);
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return casoVazio();
  }

  const fonte = json as Linha;
  const montado = casoVazio();

  for (const campo of CAMPOS_CASO) {
    if (fonte[campo] !== undefined) {
      (montado as unknown as Linha)[campo] = fonte[campo];
    }
  }

  montado.status = statusDe(montado.status);
  montado.chance = numeroDe(montado.chance, 0);
  montado.votos = votosDe(undefined, montado.votos);
  montado.partes = Array.isArray(montado.partes) ? montado.partes : [];
  montado.peticoes = Array.isArray(montado.peticoes) ? montado.peticoes : [];
  montado.contratos = Array.isArray(montado.contratos) ? montado.contratos : [];
  montado.documentos = Array.isArray(montado.documentos) ? montado.documentos : [];
  montado.decisoes = Array.isArray(montado.decisoes) ? montado.decisoes : [];
  montado.modelos = Array.isArray(montado.modelos) ? montado.modelos : [];
  montado.historico = Array.isArray(montado.historico) ? montado.historico : [];
  montado.prazos = Array.isArray(montado.prazos) ? montado.prazos : [];
  montado.teses = Array.isArray(montado.teses) ? montado.teses : [];
  montado.resultados = Array.isArray(montado.resultados) ? montado.resultados : [];
  montado.conversas = Array.isArray(montado.conversas) ? montado.conversas : [];
  montado.jurisprudencias = Array.isArray(montado.jurisprudencias)
    ? montado.jurisprudencias
    : [];
  montado.dissidios = Array.isArray(montado.dissidios) ? montado.dissidios : [];
  montado.jurimetria = jurimetriaDe(undefined, undefined, montado.jurimetria);
  montado.jurisprudencias = Array.isArray(montado.jurisprudencias)
    ? montado.jurisprudencias.map((item) => ({
        ...item,
        citavel: item.citavel === true,
        fonte: item.fonte || "acervo_interno",
      }))
    : [];

  return aplicarPoliticaCaso(montado);
}

function casoVazio(): Caso {
  return {
    id: "",
    processoId: "",
    titulo: "",
    tema: "",
    subtema: "",
    processNumber: "",
    court: "",
    chamber: "",
    status: "ATIVO",
    cliente: "",
    partes: [],
    resumo: "",
    tese: "",
    atualizacao: "",
    chance: 0,
    chanceRotulo: "",
    chanceTexto: "",
    votos: { for: 0, against: 0, diverge: 0 },
    peticoes: [],
    contratos: [],
    documentos: [],
    decisoes: [],
    modelos: [],
    historico: [],
    prazos: [],
    teses: [],
    resultados: [],
    conversas: [],
    jurisprudencias: [],
    dissidios: [],
    jurimetria: { amostra: 0, padrao: "", interno: "", riscos: [] },
    fontes: {
      titulo: "indisponivel",
      tema: "indisponivel",
      subtema: "indisponivel",
      processNumber: "indisponivel",
      court: "indisponivel",
      chamber: "indisponivel",
      status: "acervo_interno",
      cliente: "indisponivel",
      partes: "indisponivel",
      resumo: "indisponivel",
      tese: "indisponivel",
      atualizacao: "indisponivel",
      chance: "indisponivel",
      votos: "indisponivel",
      peticoes: "indisponivel",
      contratos: "indisponivel",
      documentos: "indisponivel",
      decisoes: "indisponivel",
      modelos: "indisponivel",
      historico: "indisponivel",
      prazos: "indisponivel",
      teses: "indisponivel",
      resultados: "indisponivel",
      conversas: "indisponivel",
      jurisprudencias: "indisponivel",
      dissidios: "indisponivel",
      jurimetria: "indisponivel",
    },
  };
}

function mesclarLinhas(processo?: Linha, caso?: Linha): Linha {
  return { ...(processo || {}), ...(caso || {}) };
}

function statusDe(valor: unknown): StatusProcesso {
  const bruto = String(valor ?? "").trim();
  if (STATUS_SET.has(bruto)) {
    return bruto as StatusProcesso;
  }

  const chave = bruto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  return STATUS_APELIDO[chave] || "ATIVO";
}

function numeroDe(valor: unknown, padrao: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

function booleanDe(valor: unknown): boolean {
  if (typeof valor === "boolean") {
    return valor;
  }

  const texto = String(valor ?? "").toLowerCase();
  return texto === "1" || texto === "true" || texto === "sim";
}

function listaDe(valor: unknown): unknown[] {
  const json = jsonDe(valor);
  return Array.isArray(json) ? json : [];
}

function textosDe(valor: unknown): string[] {
  return listaDe(valor)
    .map((item) => sanitizeUntrustedText(String(item).trim()))
    .filter(Boolean);
}

function partesDe(
  capa: Linha,
  clientes: Linha[],
  fallback: ParteProcesso[],
  cliente: string
): ParteProcesso[] {
  const json = jsonDe(valorCampo(capa, ALIASES.partes));

  if (Array.isArray(json)) {
    return json
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const linha = item as Linha;
        const nome = textoCampo(linha, ["nome", "name"]);
        const papel = textoCampo(linha, ["papel", "role"]);

        if (!nome && !papel) {
          return null;
        }

        return { papel, nome };
      })
      .filter((item): item is ParteProcesso => item !== null);
  }

  if (clientes.length) {
    return clientes
      .map((linha) => ({
        papel: textoCampo(linha, ALIASES.papel),
        nome: textoCampo(linha, ALIASES.cliente),
      }))
      .filter((item) => item.papel || item.nome);
  }

  if (fallback.length) {
    return fallback;
  }

  return cliente ? [{ papel: "Cliente", nome: cliente }] : [];
}

function votosDe(
  capa: Linha | undefined,
  fallback: { for: number; against: number; diverge: number }
): { for: number; against: number; diverge: number } {
  const json = jsonDe(valorCampo(capa, ALIASES.votos));

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const linha = json as Linha;
    return {
      for: numeroDe(linha.for ?? linha.aFavor, fallback.for),
      against: numeroDe(linha.against ?? linha.contra, fallback.against),
      diverge: numeroDe(linha.diverge ?? linha.divergente, fallback.diverge),
    };
  }

  const forCol = valorCampo(capa, ALIASES.votosFor);
  const againstCol = valorCampo(capa, ALIASES.votosAgainst);
  const divergeCol = valorCampo(capa, ALIASES.votosDiverge);

  if (forCol != null || againstCol != null || divergeCol != null) {
    return {
      for: numeroDe(forCol, 0),
      against: numeroDe(againstCol, 0),
      diverge: numeroDe(divergeCol, 0),
    };
  }

  return fallback;
}

export function documentoDaLinha(
  linha: Linha,
  prefixo: string,
  tipo: string,
  indice = 0
): Documento {
  return {
    id: textoCampo(linha, ALIASES.id, `${prefixo}-${indice}`),
    titulo: textoCampo(linha, ALIASES.titulo, "Sem título"),
    tipo: textoCampo(linha, ALIASES.tipo, tipo),
    data: textoCampo(linha, ALIASES.data),
    origem: textoCampo(linha, ALIASES.origem),
    resumo: textoCampo(linha, ALIASES.resumo) || textoCampo(linha, ["descricao"]),
  };
}

function documentosDe(linhas: Linha[], fallback: Documento[], prefixo: string, tipo: string): Documento[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha, indice) => documentoDaLinha(linha, prefixo, tipo, indice));
}

function andamentosDe(linhas: Linha[], fallback: Caso["historico"]): Caso["historico"] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha) => ({
    data: textoCampo(linha, ALIASES.data),
    titulo: textoCampo(linha, ALIASES.titulo) || textoCampo(linha, ["evento", "movimento"]),
    detalhe: textoCampo(linha, ALIASES.detalhe) || textoCampo(linha, ALIASES.resumo),
  }));
}

function prazosDe(linhas: Linha[], fallback: Prazo[]): Prazo[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha, indice) => {
    const prazo: Prazo = {
      id: textoCampo(linha, ALIASES.id, `prz-${indice}`),
      title: textoCampo(linha, ALIASES.prazoTitulo, "Prazo"),
      kind: prazoKindDe(valorCampo(linha, ALIASES.prazoTipo)),
      dueAt: dataIsoDe(valorCampo(linha, ALIASES.prazoVencimento)),
      days: numeroDe(valorCampo(linha, ALIASES.prazoDias), 0),
      calendar: prazoCalendarioDe(valorCampo(linha, ALIASES.prazoCalendario)),
      status: prazoStatusDe(valorCampo(linha, ALIASES.status)),
      owner: textoCampo(linha, ALIASES.prazoDono),
      trigger: textoCampo(linha, ALIASES.prazoGatilho),
      gatilhoFonte: fonteDe(valorCampo(linha, ALIASES.prazoGatilhoFonte)),
    };
    const startedAt = dataIsoDe(valorCampo(linha, ALIASES.prazoInicio));
    const notes = textoCampo(linha, ALIASES.prazoNotas);

    if (startedAt) {
      prazo.startedAt = startedAt;
    }

    if (notes) {
      prazo.notes = notes;
    }

    return prazo;
  });
}

function tesesDe(linhas: Linha[], fallback: Tese[]): Tese[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha, indice) => ({
    id: textoCampo(linha, ALIASES.id, `tese-${indice}`),
    titulo: textoCampo(linha, ALIASES.titulo, "Tese"),
    uso: textoCampo(linha, ALIASES.uso),
    forca: forcaDe(valorCampo(linha, ALIASES.forca)),
  }));
}

function resultadosDe(linhas: Linha[], fallback: ResultadoInterno[]): ResultadoInterno[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha, indice) => ({
    id: textoCampo(linha, ALIASES.id, `res-${indice}`),
    titulo: textoCampo(linha, ALIASES.titulo, "Resultado"),
    desfecho: textoCampo(linha, ALIASES.desfecho),
    aprendizado: textoCampo(linha, ALIASES.aprendizado),
  }));
}

function conversasDe(linhas: Linha[], fallback: Mensagem[]): Mensagem[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha, indice) => {
    const mensagem: Mensagem = {
      id: textoCampo(linha, ALIASES.id, `msg-${indice}`),
      autora: textoCampo(linha, ALIASES.autora),
      papel: textoCampo(linha, ALIASES.papel),
      hora: textoCampo(linha, ALIASES.hora),
      texto: textoCampo(linha, ALIASES.texto),
    };

    if (booleanDe(valorCampo(linha, ALIASES.ia))) {
      mensagem.ia = true;
    }

    if (booleanDe(valorCampo(linha, ALIASES.propria))) {
      mensagem.propria = true;
    }

    return mensagem;
  });
}

function jurisprudenciasDe(linhas: Linha[], fallback: Jurisprudencia[]): Jurisprudencia[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha, indice) => {
    const court = textoCampo(linha, ALIASES.court);
    const fonteRaw = textoCampo(linha, ["fonte", "source"]) ||
                     textoCampo(linha, ["seed_fonte", "seedFonte"]);
    const citavel = booleanDe(valorCampo(linha, ALIASES.citavel));

    const fonte = fonteDeLinha(fonteRaw, court, citavel);

    return {
      id: textoCampo(linha, ALIASES.id, `jur-${indice}`),
      processNumber: textoCampo(linha, ALIASES.numeroCnj),
      acordao: textoCampo(linha, ALIASES.acordao),
      court,
      chamber: textoCampo(linha, ALIASES.chamber),
      reporter: textoCampo(linha, ALIASES.reporter),
      date: textoCampo(linha, ALIASES.data),
      status: statusDe(valorCampo(linha, ALIASES.status)),
      alignment: alinhamentoDe(valorCampo(linha, ALIASES.alignment)),
      ementa: textoCampo(linha, ALIASES.ementa),
      pontos: textosDe(valorCampo(linha, ALIASES.pontos)),
      essencial: blocoDe(linha, "essencial"),
      fortalecer: blocoDe(linha, "fortalecer"),
      blindar: blocoDe(linha, "blindar"),
      contrapor: blocoDe(linha, "contrapor"),
      citavel,
      fonte,
    };
  });
}

function fonteDeLinha(fonteRaw: string, court: string, citavel: boolean): FonteFato {
  if (fonteRaw) {
    const normalizada = fonteDe(fonteRaw);
    if (normalizada !== "acervo_interno" && normalizada !== "indisponivel") {
      return normalizada;
    }
  }

  if (citavel && court.toUpperCase() === "TJPR") {
    return "tjpr";
  }

  return "acervo_interno";
}

function dissidiosDe(linhas: Linha[], fallback: Dissidio[]): Dissidio[] {
  if (!linhas.length) {
    return fallback;
  }

  return linhas.map((linha) => ({
    camara: textoCampo(linha, ALIASES.camara),
    orientacao: textoCampo(linha, ALIASES.orientacao),
    versus: alinhamentoDe(valorCampo(linha, ALIASES.versus)),
    nota: textoCampo(linha, ALIASES.nota),
  }));
}

function jurimetriaDe(
  linha: Linha | undefined,
  capa: Linha | undefined,
  fallback: Jurimetria
): Jurimetria {
  const json =
    jsonDe(valorCampo(linha, ALIASES.jurimetria)) ||
    jsonDe(valorCampo(capa, ALIASES.jurimetria)) ||
    linha;

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const fonte = json as Linha;
    return {
      amostra: numeroDe(valorCampo(fonte, ALIASES.amostra), fallback.amostra),
      padrao: textoCampo(fonte, ALIASES.padrao, fallback.padrao),
      interno: textoCampo(fonte, ALIASES.interno, fallback.interno),
      riscos: textosDe(valorCampo(fonte, ALIASES.riscos)).length
        ? textosDe(valorCampo(fonte, ALIASES.riscos))
        : fallback.riscos,
    };
  }

  return fallback;
}

function blocoDe(linha: Linha, prefixo: string): BlocoAnalise {
  const json = jsonDe(valorCampo(linha, [prefixo, `${prefixo}_json`]));

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const fonte = json as Linha;
    return {
      resumo: textoCampo(fonte, ["resumo", "summary"]),
      itens: textosDe(valorCampo(fonte, ["itens", "items"])),
    };
  }

  const resumo = textoCampo(linha, [`${prefixo}_resumo`, `${prefixo}Resumo`]);
  const itens = textosDe(valorCampo(linha, [`${prefixo}_itens`, `${prefixo}Itens`]));

  if (!resumo && !itens.length) {
    return BLOCO_VAZIO;
  }

  return { resumo, itens };
}

function alinhamentoDe(valor: unknown): Alinhamento {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (texto === "for" || texto === "a favor" || texto === "favoravel" || texto === "favor") {
    return "for";
  }

  if (texto === "against" || texto === "contra" || texto === "desfavoravel") {
    return "against";
  }

  if (texto === "diverge" || texto === "divergente") {
    return "diverge";
  }

  return "unknown";
}

function forcaDe(valor: unknown): ForcaTese {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (texto === "alta" || texto === "high") {
    return "alta";
  }

  if (texto === "baixa" || texto === "low") {
    return "baixa";
  }

  return "media";
}

function dataIsoDe(valor: unknown): string {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  const texto = String(valor ?? "").trim();
  const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    return iso[1];
  }

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  return texto;
}

function prazoKindDe(valor: unknown): PrazoKind {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    texto === "manifestacao" ||
    texto === "recurso" ||
    texto === "prova" ||
    texto === "audiencia" ||
    texto === "interno" ||
    texto === "outro"
  ) {
    return texto;
  }

  return "outro";
}

function prazoCalendarioDe(valor: unknown): PrazoCalendario {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return texto === "corridos" ? "corridos" : "uteis";
}

function prazoStatusDe(valor: unknown): PrazoStatus {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    texto === "aberto" ||
    texto === "a_vencer" ||
    texto === "vencido" ||
    texto === "cumprido" ||
    texto === "suspenso"
  ) {
    return texto;
  }

  return "aberto";
}

function fonteDe(valor: unknown): FonteFato {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (texto === "tjpr" || texto === "tjpr_portal_publico") {
    return "tjpr";
  }

  if (
    texto === "datajud" ||
    texto === "acervo_interno" ||
    texto === "inferencia" ||
    texto === "indisponivel"
  ) {
    return texto;
  }

  return "acervo_interno";
}
