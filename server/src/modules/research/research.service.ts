import { DissidioService } from "@modules/dissidio/dissidio.service";
import { JurisprudenceService } from "@modules/jurisprudence/jurisprudence.service";
import { ProcessService } from "@modules/process/process.service";
import { ResearchDto } from "@modules/research/research.dto";
import { ResultadoPesquisa } from "@models/pesquisa.model";
import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class ResearchService {
  constructor(
    private processService: ProcessService,
    private jurisprudenceService: JurisprudenceService,
    private dissidioService: DissidioService
  ) {}

  async pesquisar(dto: ResearchDto): Promise<ResultadoPesquisa> {
    const processNumber = this.processService.normalizarNumero(
      dto.processNumber
    );

    if (!processNumber) {
      throw new BadRequestException("O número do processo é obrigatório.");
    }

    if (!this.processService.numeroValido(processNumber)) {
      throw new BadRequestException(
        "Número inválido. Use o padrão CNJ: 0000000-00.0000.0.00.0000."
      );
    }

    await this.atrasoDemo();

    const capa = this.processService.buscarCapa(processNumber);
    const encontradas = this.jurisprudenceService.buscarRelacionadas(
      capa.subjects
    );
    const jurisprudences = this.dissidioService.classificar(capa, encontradas);
    const dissidioReport = this.dissidioService.montarRelatorioDissidio(
      capa,
      jurisprudences
    );
    const chanceReport = this.dissidioService.montarRelatorioChance(
      capa,
      jurisprudences
    );

    return {
      demo: true,
      process: {
        ...capa,
        importedFile: dto.fileName ? { name: dto.fileName } : undefined,
      },
      jurisprudences,
      dissidioReport,
      chanceReport,
    };
  }

  private atrasoDemo() {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}
