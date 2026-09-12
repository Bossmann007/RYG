/**
 * Vocabulário controlado de assuntos.
 *
 * Assunto processual não é texto livre: no mundo real vem das Tabelas
 * Processuais Unificadas do CNJ, com código. Por isso um assunto catalogado
 * pode atravessar o gateway — ele identifica uma categoria pública, não o caso.
 * O que não está catalogado vira balde, porque texto livre não controlado é
 * exatamente por onde informação do cliente escaparia.
 */
export const ASSUNTOS_CATALOGADOS = new Set([
  "Contratos bancários",
  "Revisão de contrato",
  "Tarifa de cadastro",
  "Seguro prestamista",
  "Juros remuneratórios",
  "Capitalização de juros",
]);

export const ASSUNTO_NAO_CATALOGADO = "assunto não catalogado";

export function normalizarAssuntos(assuntos: string[]): string[] {
  const saida = new Set<string>();

  for (const assunto of assuntos || []) {
    saida.add(
      ASSUNTOS_CATALOGADOS.has(assunto) ? assunto : ASSUNTO_NAO_CATALOGADO
    );
  }

  return [...saida];
}
