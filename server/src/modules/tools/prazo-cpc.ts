/**
 * CPC art. 219: the start date does not count. Only Monday–Friday count.
 * Court holidays are not applied.
 */
export function termoDiasUteis(inicioIso: string, dias: number): string {
  const partes = inicioIso.split("-").map((parte) => Number(parte));
  const ano = partes[0];
  const mes = partes[1];
  const dia = partes[2];
  const cursor = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    cursor.getUTCFullYear() !== ano ||
    cursor.getUTCMonth() !== mes - 1 ||
    cursor.getUTCDate() !== dia
  ) {
    throw new Error("data inválida");
  }

  let restantes = dias;
  while (restantes > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const semana = cursor.getUTCDay();
    if (semana !== 0 && semana !== 6) {
      restantes -= 1;
    }
  }

  return cursor.toISOString().slice(0, 10);
}
