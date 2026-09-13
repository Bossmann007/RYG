import { Peticao, PeticaoListaItem } from "@models/peticao.model";
import { ClientsService } from "@modules/clients/clients.service";
import { ProcessService } from "@modules/process/process.service";
import { PETICOES_INICIAIS } from "../../fixtures/peticoes";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { CreatePeticaoDto, UpdatePeticaoDto } from "./petitions.dto";

@Injectable()
export class PetitionsService {
  private readonly porId = new Map<string, Peticao>();

  constructor(
    private clientsService: ClientsService,
    private processService: ProcessService
  ) {
    for (const peticao of PETICOES_INICIAIS) {
      this.porId.set(peticao.id, { ...peticao });
    }
  }

  listar(filtro: { clienteId?: string; processNumber?: string }): PeticaoListaItem[] {
    const clienteId = filtro.clienteId?.trim();
    const processNumber = filtro.processNumber
      ? this.normalizarProcessoOpcional(filtro.processNumber)
      : undefined;

    return [...this.porId.values()]
      .filter((peticao) => !clienteId || peticao.clienteId === clienteId)
      .filter((peticao) => !processNumber || peticao.processNumber === processNumber)
      .sort((a, b) => (b.filedAt || b.createdAt).localeCompare(a.filedAt || a.createdAt))
      .map((peticao) => this.paraLista(peticao));
  }

  obter(id: string): Peticao {
    const peticao = this.porId.get(id);

    if (!peticao) {
      throw new NotFoundException("Petição não encontrada.");
    }

    return this.copiar(peticao);
  }

  criar(dto: CreatePeticaoDto): Peticao {
    this.garantirCliente(dto.clienteId);
    const agora = new Date().toISOString();
    const peticao: Peticao = {
      id: `pet_${randomBytes(6).toString("hex")}`,
      clienteId: dto.clienteId.trim(),
      title: dto.title.trim(),
      kind: dto.kind,
      status: dto.status ?? "rascunho",
      summary: dto.summary.trim(),
      createdAt: agora,
      updatedAt: agora,
    };
    const processNumber = this.normalizarProcessoOpcional(dto.processNumber);
    const filedAt = dto.filedAt?.trim();

    if (processNumber) {
      peticao.processNumber = processNumber;
    }

    if (filedAt) {
      peticao.filedAt = filedAt;
    }

    this.porId.set(peticao.id, peticao);
    return this.copiar(peticao);
  }

  atualizar(id: string, dto: UpdatePeticaoDto): Peticao {
    const atual = this.obter(id);

    if (dto.clienteId) {
      this.garantirCliente(dto.clienteId);
    }

    const proximo: Peticao = {
      id: atual.id,
      clienteId: dto.clienteId?.trim() || atual.clienteId,
      title: dto.title?.trim() || atual.title,
      kind: dto.kind ?? atual.kind,
      status: dto.status ?? atual.status,
      summary: dto.summary?.trim() || atual.summary,
      createdAt: atual.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const processNumber =
      dto.processNumber !== undefined
        ? this.normalizarProcessoOpcional(dto.processNumber)
        : atual.processNumber;
    const filedAt = dto.filedAt !== undefined ? dto.filedAt.trim() : atual.filedAt;

    if (processNumber) {
      proximo.processNumber = processNumber;
    }

    if (filedAt) {
      proximo.filedAt = filedAt;
    }

    this.porId.set(id, proximo);
    return this.copiar(proximo);
  }

  remover(id: string): void {
    this.obter(id);
    this.porId.delete(id);
  }

  private garantirCliente(clienteId: string): void {
    if (!this.clientsService.existe(clienteId.trim())) {
      throw new BadRequestException("clienteId não corresponde a um cliente existente.");
    }
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

  private paraLista(peticao: Peticao): PeticaoListaItem {
    const item: PeticaoListaItem = {
      id: peticao.id,
      clienteId: peticao.clienteId,
      title: peticao.title,
      kind: peticao.kind,
      status: peticao.status,
      updatedAt: peticao.updatedAt,
    };

    if (peticao.processNumber) {
      item.processNumber = peticao.processNumber;
    }

    if (peticao.filedAt) {
      item.filedAt = peticao.filedAt;
    }

    return item;
  }

  private copiar(peticao: Peticao): Peticao {
    return { ...peticao };
  }
}
