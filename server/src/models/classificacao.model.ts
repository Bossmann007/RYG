/**
 * Rótulos de Information Flow Control.
 *
 * A classificação nasce na origem do dado, não no momento da saída. É ela que
 * decide quanto de informação precisa ser destruída antes de atravessar o
 * gateway — e é por isso que ela viaja junto com o valor (taint) em vez de ser
 * inferida depois, quando a proveniência já se perdeu.
 */
export type Sigilo = "publico" | "interno" | "cliente" | "sigiloso";

/** Ordem de severidade. A junção de duas fontes assume o rótulo mais alto. */
export const ORDEM_SIGILO: Sigilo[] = [
  "publico",
  "interno",
  "cliente",
  "sigiloso",
];

export function maiorSigilo(rotulos: Sigilo[]): Sigilo {
  return rotulos.reduce<Sigilo>(
    (maior, atual) =>
      ORDEM_SIGILO.indexOf(atual) > ORDEM_SIGILO.indexOf(maior) ? atual : maior,
    "publico"
  );
}

/** Um valor e a classificação da fonte de onde ele veio. */
export type Rotulado<T> = {
  valor: T;
  sigilo: Sigilo;
  /** Identificador da fonte, para a proveniência do DTO. */
  fonte: string;
};

export function rotular<T>(valor: T, sigilo: Sigilo, fonte: string): Rotulado<T> {
  return { valor, sigilo, fonte };
}

/**
 * Quanto de informação sobrevive à saída.
 *
 * - `integral`: o texto da fonte pode sair como está. Só para `publico`.
 * - `abstrato`: nada de texto livre da fonte; valores de vocabulário
 *   controlado, contagens e faixas.
 * - `resumo`: apenas afirmações geradas sobre o conjunto. Nenhum valor da fonte.
 */
export type NivelDeclassificacao = "integral" | "abstrato" | "resumo";

/**
 * Teto de declassificação por rótulo. É um teto, não um alvo: uma ferramenta
 * pode devolver menos do que o teto permite, nunca mais.
 */
export const TETO_POR_SIGILO: Record<Sigilo, NivelDeclassificacao> = {
  publico: "integral",
  interno: "abstrato",
  cliente: "resumo",
  sigiloso: "resumo",
};
