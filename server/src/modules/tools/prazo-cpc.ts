/**
 * Deterministic CPC-style deadline math (no LLM).
 * Business days skip Sat/Sun and a fixed Brazilian federal holiday set for 2024–2027.
 * Not a full court calendar — enough for hub PMS tool smoke.
 */

export type CalendarioPrazo = "uteis" | "corridos";

export type EntradaPrazoCpc = {
  startedAt: string;
  days: number;
  calendar: CalendarioPrazo;
};

export type ResultadoPrazoCpc = {
  startedAt: string;
  days: number;
  calendar: CalendarioPrazo;
  dueAt: string;
  regra: string;
  feriadosAplicados: string[];
};

const FERIADOS_FIXOS = new Set([
  "01-01",
  "04-21",
  "05-01",
  "09-07",
  "10-12",
  "11-02",
  "11-15",
  "11-20",
  "12-25",
]);

/** Movable / observed holidays commonly used in office calendars (YYYY-MM-DD). */
const FERIADOS_MOVEIS = new Set([
  "2024-02-12",
  "2024-02-13",
  "2024-03-29",
  "2024-05-30",
  "2025-03-03",
  "2025-03-04",
  "2025-04-18",
  "2025-06-19",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-06-04",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-05-27",
]);

export function calcularPrazoCpc(entrada: EntradaPrazoCpc): ResultadoPrazoCpc {
  const days = entrada.days;
  if (!Number.isSafeInteger(days) || days < 1 || days > 3650) {
    throw new Error("days deve ser inteiro entre 1 e 3650.");
  }
  if (entrada.calendar !== "uteis" && entrada.calendar !== "corridos") {
    throw new Error('calendar deve ser "uteis" ou "corridos".');
  }

  const inicio = parseDataIso(entrada.startedAt);
  const feriadosAplicados: string[] = [];
  let cursor = new Date(inicio.getTime());
  let restantes = days;

  while (restantes > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const iso = dataIsoUtc(cursor);
    if (entrada.calendar === "corridos") {
      restantes -= 1;
      continue;
    }
    if (ehFimDeSemana(cursor)) {
      continue;
    }
    if (ehFeriado(cursor)) {
      feriadosAplicados.push(iso);
      continue;
    }
    restantes -= 1;
  }

  // CPC art. 224: if the last day is not a business day, roll forward.
  while (ehFimDeSemana(cursor) || ehFeriado(cursor)) {
    if (ehFeriado(cursor)) {
      feriadosAplicados.push(dataIsoUtc(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    startedAt: dataIsoUtc(inicio),
    days,
    calendar: entrada.calendar,
    dueAt: dataIsoUtc(cursor),
    regra:
      entrada.calendar === "uteis"
        ? "CPC arts. 219 e 224 — dias úteis + prorrogação se o termo final não for útil (feriados federais stub)."
        : "CPC arts. 219 e 224 — dias corridos; se o termo final cair em sáb/dom/feriado, prorroga ao próximo dia útil.",
    feriadosAplicados: [...new Set(feriadosAplicados)].sort(),
  };
}

function parseDataIso(valor: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || "")) {
    throw new Error("startedAt deve ser YYYY-MM-DD.");
  }
  const data = new Date(`${valor}T12:00:00.000Z`);
  if (Number.isNaN(data.getTime()) || dataIsoUtc(data) !== valor) {
    throw new Error("startedAt inválido.");
  }
  return data;
}

function dataIsoUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function ehFimDeSemana(data: Date): boolean {
  const dia = data.getUTCDay();
  return dia === 0 || dia === 6;
}

function ehFeriado(data: Date): boolean {
  const iso = dataIsoUtc(data);
  if (FERIADOS_MOVEIS.has(iso)) {
    return true;
  }
  return FERIADOS_FIXOS.has(iso.slice(5));
}
