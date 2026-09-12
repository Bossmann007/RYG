import { Injectable } from "@nestjs/common";

type Detector = {
  nome: string;
  padrao: RegExp;
};

/**
 * Rede final de DLP. Não redige: **detecta**.
 *
 * A diferença é deliberada. Enquanto o gateway devolvia registro filtrado,
 * redigir fazia sentido. Agora que a saída é construída campo a campo, um PII
 * aparecendo no DTO não é algo a limpar — é sinal de que a declassificação
 * falhou, e a resposta certa é não deixar sair nada. Papel de alarme, não de
 * faxina.
 */
@Injectable()
export class DlpService {
  private readonly detectores: Detector[] = [
    { nome: "cpf", padrao: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
    { nome: "cnpj", padrao: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/ },
    { nome: "email", padrao: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/ },
    { nome: "oab", padrao: /\bOAB\s*\/?\s*[A-Z]{2}\s*n?º?\s*\d{3,}\b/i },
    { nome: "telefone", padrao: /\(\d{2}\)\s?9?\d{4}-\d{4}\b/ },
    { nome: "cartao", padrao: /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/ },
    { nome: "valor_monetario", padrao: /R\$\s?\d{1,3}(\.\d{3})*(,\d{2})?/ },
  ];

  /** Nomes dos detectores que dispararam no conteúdo. Vazio = limpo. */
  detectar(conteudo: unknown): string[] {
    const texto =
      typeof conteudo === "string" ? conteudo : JSON.stringify(conteudo ?? "");

    return this.detectores
      .filter((detector) => detector.padrao.test(texto))
      .map((detector) => detector.nome);
  }
}
