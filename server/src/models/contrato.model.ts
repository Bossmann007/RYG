/**
 * Mesma forma que o front ja consome (tipo `Documento` em client/src/tipos.ts).
 * Renomear ou remover um campo aqui quebra a aba de contratos silenciosamente,
 * porque o layout le esses nomes direto. Os dois lados precisam mudar juntos.
 */
export type Documento = {
  id: string;
  titulo: string;
  tipo: string;
  data: string;
  origem: string;
  resumo: string;
};

/**
 * Um contrato e um documento preso a um caso.
 *
 * `casoId` e um campo a mais em cima de `Documento`, nao um campo diferente:
 * o payload continua sendo um `Documento` valido para o front, que ignora o
 * extra. Isso permite ligar os endpoints sem tocar em tipos.ts.
 */
export type Contrato = Documento & {
  casoId: string;
};

export type NovoContrato = Omit<Contrato, "id">;

/** `id` e `casoId` ficam de fora: mover contrato entre casos nao e edicao. */
export type EdicaoContrato = Partial<Omit<Contrato, "id" | "casoId">>;
