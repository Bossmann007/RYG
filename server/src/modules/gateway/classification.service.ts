import { Rotulado, rotular } from "@models/classificacao.model";
import { JurisprudenciaFixture } from "@models/jurisprudencia.model";
import { ResultadoPesquisa } from "@models/pesquisa.model";
import { Processo } from "@models/processo.model";
import { JurisprudenceService } from "@modules/jurisprudence/jurisprudence.service";
import { ProcessService } from "@modules/process/process.service";
import { ResearchService } from "@modules/research/research.service";
import { Injectable } from "@nestjs/common";

/**
 * Fronteira entre o acervo e o gateway. Nada sai daqui sem rótulo.
 *
 * O ponto de ter uma camada só para isto: a classificação é uma propriedade da
 * fonte, decidida uma vez, e não um palpite de quem está montando a resposta.
 * Um proxy MCP na saída não conseguiria fazer isso — ele vê o JSON já pronto e
 * não sabe se aquele texto veio de um acórdão público ou da peça do cliente.
 */
@Injectable()
export class ClassificationService {
  constructor(
    private processService: ProcessService,
    private jurisprudenceService: JurisprudenceService,
    private researchService: ResearchService
  ) {}

  /** Capa de processo é dado de cliente, mesmo quando o número é público. */
  capaDoProcesso(numero: string): Rotulado<Processo> {
    return rotular(
      this.processService.buscarCapa(numero),
      "cliente",
      "acervo:processo"
    );
  }

  /** Acórdão publicado é público. Ementa só atravessa se for citável. */
  jurisprudencia(assuntos: string[]): Rotulado<JurisprudenciaFixture[]> {
    return rotular(
      this.jurisprudenceService.buscarRelacionadas(assuntos),
      "publico",
      "acervo:jurisprudencia"
    );
  }

  /**
   * A análise cruza capa (cliente) com jurisprudência (público). Pela regra de
   * junção do IFC, o resultado herda o rótulo mais alto — o dado derivado não
   * fica menos sigiloso por ter sido misturado com dado público.
   */
  async analise(numero: string): Promise<Rotulado<ResultadoPesquisa>> {
    const resultado = await this.researchService.pesquisar({
      processNumber: numero,
    });

    return rotular(resultado, "cliente", "acervo:analise");
  }

  /**
   * Texto das fontes não públicas do resultado. É contra isto que o validador
   * confere os campos gerados: nenhum trecho daqui pode reaparecer na saída.
   */
  textoSensivel(resultado: ResultadoPesquisa): string[] {
    const processo = resultado.process;

    return [
      processo.summary,
      processo.thesis,
      processo.courtUnit,
      ...processo.parties.map((parte) => parte.nome),
      ...processo.movements.map((andamento) => andamento.descricao),
    ].filter(Boolean);
  }

  /**
   * Identificadores curtos das fontes sigilosas. Vao separados do texto porque
   * a checagem deles e outra: nome de parte tem 3 palavras e nao seria pego por
   * uma janela de n-gramas.
   */
  entidadesSensiveis(resultado: ResultadoPesquisa): string[] {
    return [
      ...resultado.process.parties.map((parte) => parte.nome),
      resultado.process.courtUnit,
    ].filter(Boolean);
  }
}
