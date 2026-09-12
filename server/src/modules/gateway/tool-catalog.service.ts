import { Identidade } from "@models/gateway.model";
import { EnvelopeSafe } from "@models/safe-dto.model";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { ClassificationService } from "./classification.service";
import { DeclassifyService } from "./declassify.service";

export type FerramentaGateway = {
  nome: string;
  titulo: string;
  descricao: string;
  esquema: z.ZodObject<z.ZodRawShape>;
  /** Só leitura: nenhuma ferramenta do acervo escreve no acervo. */
  somenteLeitura: true;
  executar: (
    argumentos: Record<string, unknown>,
    identidade: Identidade | null
  ) => Promise<EnvelopeSafe<string, unknown>>;
};

/**
 * A superfície MCP do escritório.
 *
 * Todo verbo aqui devolve `EnvelopeSafe` — nunca um registro do acervo. Não
 * existe `get_raw_document`, `execute_sql` nem `get_all_messages`, e a ausência
 * é estrutural: o tipo de retorno não comporta. A ferramenta não é um filtro
 * sobre o dado bruto; ela é o único formato em que o dado pode existir do lado
 * de fora.
 */
@Injectable()
export class ToolCatalogService {
  private readonly ferramentas: FerramentaGateway[];

  constructor(
    private classificationService: ClassificationService,
    private declassifyService: DeclassifyService
  ) {
    this.ferramentas = this.montar();
  }

  listar(): FerramentaGateway[] {
    return this.ferramentas;
  }

  buscar(nome: string): FerramentaGateway | undefined {
    return this.ferramentas.find((ferramenta) => ferramenta.nome === nome);
  }

  private montar(): FerramentaGateway[] {
    return [
      {
        nome: "enter_office",
        titulo: "Entrar no escritório",
        descricao:
          "Handshake com o escritório: devolve quem você é para o gateway, quais verbos a sua credencial libera e qual o teto de declassificação de cada nível de sigilo. Chame primeiro, antes de qualquer consulta.",
        esquema: z.object({}),
        somenteLeitura: true,
        executar: async (_argumentos, identidade) => ({
          tipo: "office_manifest",
          conteudo: {
            escritorio: identidade?.escritorio || "(sem credencial)",
            papel: identidade?.papel || "desconhecido",
            ferramentas: this.ferramentas.map((ferramenta) => ferramenta.nome),
            politica:
              "Nenhum registro do acervo sai deste escritório. Toda resposta é um DTO construído a partir de vocabulário controlado, contagens e texto gerado, limitado pelo rótulo de sigilo da fonte.",
            tetoDeDeclassificacao: this.declassifyService.tetos(),
          },
          declassificacao: {
            sigiloOrigem: "publico",
            nivel: "integral",
            fontes: ["gateway:politica"],
            omitido: [],
          },
        }),
      },
      {
        nome: "get_safe_summary",
        titulo: "Resumo seguro do caso",
        descricao:
          "Situação de um processo em forma reduzida: tribunal, grau, órgão julgador, fase, assuntos catalogados, contagens e a orientação do órgão. Não devolve partes, andamentos, tese nem qualquer texto da peça — esses dados existem no escritório e não atravessam.",
        esquema: z.object({
          processNumber: z
            .string()
            .describe("Número do processo no padrão CNJ: 0000000-00.0000.0.00.0000"),
        }),
        somenteLeitura: true,
        executar: async (argumentos) => {
          const capa = this.classificationService.capaDoProcesso(
            String(argumentos.processNumber)
          );

          return this.declassifyService.resumoDeCaso(capa);
        },
      },
      {
        nome: "search_safe_knowledge",
        titulo: "Busca no conhecimento público",
        descricao:
          "Procura precedentes ligados a assuntos catalogados. Acórdão publicado é fonte pública, então a ementa sai na íntegra — é a classificação da fonte que autoriza, não uma exceção da ferramenta. Itens sem ementa oficial voltam marcados como não citáveis.",
        esquema: z.object({
          assuntos: z
            .array(z.string())
            .min(1)
            .describe(
              "Assuntos da tese, ex.: ['Tarifa de cadastro', 'Seguro prestamista']"
            ),
        }),
        somenteLeitura: true,
        executar: async (argumentos) => {
          const assuntos = (argumentos.assuntos as string[]) || [];
          const itens = this.classificationService.jurisprudencia(assuntos);

          return this.declassifyService.conhecimento(itens, assuntos);
        },
      },
      {
        nome: "get_safe_update",
        titulo: "Atualização estratégica do caso",
        descricao:
          "Leitura estratégica de um processo: faixa de risco, quantos precedentes alinham, divergem ou contrariam o órgão do caso, síntese gerada e pontos de atenção. Sem pontuação numérica, sem texto de voto, sem dados do cliente.",
        esquema: z.object({
          processNumber: z
            .string()
            .describe("Número do processo no padrão CNJ a ser analisado"),
        }),
        somenteLeitura: true,
        executar: async (argumentos) => {
          const analise = await this.classificationService.analise(
            String(argumentos.processNumber)
          );
          const sensivel = this.classificationService.textoSensivel(analise.valor);
          const entidades = this.classificationService.entidadesSensiveis(
            analise.valor
          );

          return this.declassifyService.atualizacaoEstrategica(
            analise,
            sensivel,
            entidades
          );
        },
      },
    ];
  }
}
