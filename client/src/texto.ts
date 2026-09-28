export function fraseOficial(valor: string): string {
  const limpo = valor.replace(/\s+/g, " ").trim();
  if (!limpo) {
    return "";
  }

  const letras = limpo.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const minusculas = letras.replace(/[^a-zà-ÿ]/g, "").length;
  // Fold only true caixa-alta. Mixed case ("Do JSON") stays; acronyms are not shouting.
  if (!letras.length || minusculas > 0) {
    return limpo;
  }

  const baixo = limpo.toLocaleLowerCase("pt-BR");
  return baixo.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, sep: string, letra: string) => {
    return sep + letra.toLocaleUpperCase("pt-BR");
  });
}
