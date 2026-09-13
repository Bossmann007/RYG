export function fraseOficial(valor: string): string {
  const limpo = valor.replace(/\s+/g, " ").trim();
  if (!limpo) {
    return "";
  }

  const letras = limpo.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const maiusculas = letras.replace(/[^A-ZÀ-Ý]/g, "").length;
  if (!letras.length || maiusculas / letras.length <= 0.45) {
    return limpo;
  }

  const baixo = limpo.toLocaleLowerCase("pt-BR");
  return baixo.replace(/(^|[.!?]\s+)(\p{L})/gu, (_, sep: string, letra: string) => {
    return sep + letra.toLocaleUpperCase("pt-BR");
  });
}
