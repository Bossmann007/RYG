import { Decisao, DecisaoKind, DecisaoListaItem } from "@models/decisao.model";
import { ClientsService } from "@modules/clients/clients.service";
import { ProcessService } from "@modules/process/process.service";
import { DECISOES_INICIAIS } from "../../fixtures/decisoes";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { CreateDecisaoDto, UpdateDecisaoDto } from "./decisions.dto";

@Injectable()
export class DecisionsService {
  private readonly porId = new Map<string, Decisao>();

  constructor(
    private clientsService: ClientsService,
    private processService: ProcessService
  ) {
    for (const decisao of DECISOES_INICIAIS) {
      this.porId.set(decisao.id, { ...decisao });
    }
  }

  listar(filtro: {
    clienteId?: string;
    processNumber?: string;
    kind?: DecisaoKind;
  }): DecisaoListaItem[] {
    const clienteId = filtro.clienteId?.trim();
    const processNumber = filtro.processNumber
      ? this.normalizarProcessoOpcional(filtro.processNumber)
      : undefined;
    const kind = filtro.kind;

    return [...this.porId.values()]
      .filter((decisao) => !clienteId || decisao.clienteId === clienteId)
      .filter((decisao) => !processNumber || decisao.processNumber === processNumber)
      .filter((decisao) => !kind || decisao.kind === kind)
      .sort((a, b) => (b.decidedAt || b.createdAt).localeCompare(a.decidedAt || a.createdAt))
      .map((decisao) => this.paraLista(decisao));
  }

  obter(id: string): Decisao {
    const decisao = this.porId.get(id);

    if (!decisao) {
      throw new NotFoundException("Decisão não encontrada.");
    }

    return this.copiar(decisao);
  }

  criar(dto: CreateDecisaoDto): Decisao {
    const clienteId = this.normalizarClienteOpcional(dto.clienteId);
    const agora = new Date().toISOString();
    const decisao: Decisao = {
      id: `dec_${randomBytes(6).toString("hex")}`,
      title: dto.title.trim(),
      kind: dto.kind,
      summary: dto.summary.trim(),
      status: dto.status ?? "rascunho",
      createdAt: agora,
      updatedAt: agora,
    };
    const processNumber = this.normalizarProcessoOpcional(dto.processNumber);

    if (processNumber) {
      decisao.processNumber = processNumber;
    }

    if (clienteId) {
      decisao.clienteId = clienteId;
    }

    this.aplicarMetadados(decisao, dto);

    this.porId.set(decisao.id, decisao);
    return this.copiar(decisao);
  }

  atualizar(id: string, dto: UpdateDecisaoDto): Decisao {
    const atual = this.obter(id);
    const proximo: Decisao = {
      id: atual.id,
      title: dto.title?.trim() || atual.title,
      kind: dto.kind ?? atual.kind,
      summary: dto.summary?.trim() || atual.summary,
      status: dto.status ?? atual.status,
      createdAt: atual.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const processNumber =
      dto.processNumber !== undefined
        ? this.normalizarProcessoOpcional(dto.processNumber)
        : atual.processNumber;
    const clienteId =
      dto.clienteId !== undefined
        ? this.normalizarClienteOpcional(dto.clienteId)
        : atual.clienteId;

    if (processNumber) {
      proximo.processNumber = processNumber;
    }

    if (clienteId) {
      proximo.clienteId = clienteId;
    }

    this.aplicarMetadados(proximo, {
      court: dto.court !== undefined ? dto.court : atual.court,
      chamber: dto.chamber !== undefined ? dto.chamber : atual.chamber,
      decidedAt: dto.decidedAt !== undefined ? dto.decidedAt : atual.decidedAt,
      outcome: dto.outcome !== undefined ? dto.outcome : atual.outcome,
    });

    this.porId.set(id, proximo);
    return this.copiar(proximo);
  }

  remover(id: string): void {
    this.obter(id);
    this.porId.delete(id);
  }

  private aplicarMetadados(
    alvo: Decisao,
    origem: {
      court?: string;
      chamber?: string;
      decidedAt?: string;
      outcome?: Decisao["outcome"];
    }
  ): void {
    const court = origem.court?.trim();
    const chamber = origem.chamber?.trim();
    const decidedAt = origem.decidedAt?.trim();

    if (court) {
      alvo.court = court;
    }

    if (chamber) {
      alvo.chamber = chamber;
    }

    if (decidedAt) {
      alvo.decidedAt = decidedAt;
    }

    if (origem.outcome) {
      alvo.outcome = origem.outcome;
    }
  }

  private normalizarClienteOpcional(clienteId?: string): string | undefined {
    const bruto = (clienteId || "").trim();

    if (!bruto) {
      return undefined;
    }

    if (!this.clientsService.existe(bruto)) {
      throw new BadRequestException("clienteId não corresponde a um cliente existente.");
    }

    return bruto;
  }

  private normalizarProcessoOpcional(numero?: string): string | undefined {
    const bruto = (numero || "").trim();

    if (!bruto) {
      return undefined;
    }

    const normalizado = this.processService.normalizarNumero(bruto);

    if (!this.processService.numeroValido(normalizado)) {
      throw new BadRequestException(
        "Número inválido. Use o padrão CNJ: 0000000-00.0000.0.00.0000."
      );
    }

    return normalizado;
  }

  private paraLista(decisao: Decisao): DecisaoListaItem {
    const item: DecisaoListaItem = {
      id: decisao.id,
      title: decisao.title,
      kind: decisao.kind,
      status: decisao.status,
      updatedAt: decisao.updatedAt,
    };

    if (decisao.processNumber) {
      item.processNumber = decisao.processNumber;
    }

    if (decisao.clienteId) {
      item.clienteId = decisao.clienteId;
    }

    if (decisao.court) {
      item.court = decisao.court;
    }

    if (decisao.chamber) {
      item.chamber = decisao.chamber;
    }

    if (decisao.decidedAt) {
      item.decidedAt = decisao.decidedAt;
    }

    if (decisao.outcome) {
      item.outcome = decisao.outcome;
    }

    return item;
  }

  private copiar(decisao: Decisao): Decisao {
    return { ...decisao };
  }
}
