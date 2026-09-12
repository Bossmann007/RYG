import {
  Identidade,
  Origem,
  RegistroAuditoria,
  ResultadoFerramenta,
} from "@models/gateway.model";
import { EnvelopeSafe } from "@models/safe-dto.model";
import { Injectable, Logger } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { FalhaDeDeclassificacao } from "./declassify.service";
import { PolicyService } from "./policy.service";
import { FerramentaGateway, ToolCatalogService } from "./tool-catalog.service";

/**
 * O gateway. Único caminho entre o acervo e qualquer IA externa:
 *
 *   identidade → política (default deny) → validação → execução →
 *   declassificação verificada → auditoria
 *
 * Fail closed em toda etapa. Se a declassificação não conseguir provar que a
 * saída é segura, a resposta é a mesma de uma negação de política: nada sai.
 * Falhar fechado significa que um bug no declassificador vira indisponibilidade,
 * nunca vazamento.
 */
@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private policyService: PolicyService,
    private auditService: AuditService,
    private toolCatalogService: ToolCatalogService
  ) {}

  ferramentasPara(identidade: Identidade | null): FerramentaGateway[] {
    const permitidas = this.policyService.ferramentasPermitidas(identidade);

    return this.toolCatalogService
      .listar()
      .filter((ferramenta) => permitidas.includes(ferramenta.nome));
  }

  async executar(
    nome: string,
    argumentos: Record<string, unknown>,
    identidade: Identidade | null,
    origem: Origem
  ): Promise<ResultadoFerramenta> {
    const inicio = Date.now();
    const ferramenta = this.toolCatalogService.buscar(nome);

    if (!ferramenta) {
      return this.negar(
        nome,
        argumentos,
        identidade,
        origem,
        inicio,
        `Ferramenta '${nome}' não existe no gateway.`
      );
    }

    const avaliacao = this.policyService.avaliar(identidade, nome);

    if (avaliacao.decisao === "negado") {
      return this.negar(nome, argumentos, identidade, origem, inicio, avaliacao.motivo);
    }

    const validacao = ferramenta.esquema.safeParse(argumentos);

    if (!validacao.success) {
      const detalhe = validacao.error.issues
        .map((problema) => `${problema.path.join(".") || "(raiz)"}: ${problema.message}`)
        .join("; ");

      return this.negar(
        nome,
        argumentos,
        identidade,
        origem,
        inicio,
        `Argumentos inválidos — ${detalhe}`
      );
    }

    let dto: EnvelopeSafe<string, unknown>;

    try {
      dto = await ferramenta.executar(
        validacao.data as Record<string, unknown>,
        identidade
      );
    } catch (erro) {
      // Falha de declassificação não é erro de aplicação: é a barreira
      // funcionando. Vira negação, com a mesma trilha das demais.
      const motivo =
        erro instanceof FalhaDeDeclassificacao
          ? `Declassificação reprovada — ${erro.motivo}`
          : erro instanceof Error
            ? erro.message
            : "Falha ao consultar o acervo.";

      return this.negar(nome, argumentos, identidade, origem, inicio, motivo);
    }

    await this.auditService.registrar({
      ...this.registro(nome, argumentos, identidade, origem, inicio, "permitido"),
      sigiloOrigem: dto.declassificacao.sigiloOrigem,
      nivel: dto.declassificacao.nivel,
      omitido: dto.declassificacao.omitido,
    });

    return {
      decisao: "permitido",
      ferramenta: nome,
      conteudo: dto,
      omitido: dto.declassificacao.omitido,
    };
  }

  private async negar(
    nome: string,
    argumentos: Record<string, unknown>,
    identidade: Identidade | null,
    origem: Origem,
    inicio: number,
    motivo?: string
  ): Promise<ResultadoFerramenta> {
    this.logger.warn(`Negado '${nome}' para ${identidade?.id || "anônimo"}: ${motivo}`);

    await this.auditService.registrar({
      ...this.registro(nome, argumentos, identidade, origem, inicio, "negado"),
      motivo,
    });

    return { decisao: "negado", ferramenta: nome, motivo, omitido: [] };
  }

  private registro(
    ferramenta: string,
    argumentos: Record<string, unknown>,
    identidade: Identidade | null,
    origem: Origem,
    inicio: number,
    decisao: "permitido" | "negado"
  ): RegistroAuditoria {
    return {
      at: new Date().toISOString(),
      identidade: identidade?.id || "anonimo",
      nome: identidade?.nome || "(sem credencial)",
      papel: identidade?.papel || "desconhecido",
      origem,
      ferramenta,
      argumentos,
      decisao,
      omitido: [],
      duracaoMs: Date.now() - inicio,
    };
  }
}
