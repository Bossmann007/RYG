import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import {
  Ciphertext,
  SecretValue,
  VaultName,
  deriveVaultKey,
  open,
  seal,
} from "./vault.crypto";

type ArgsDeGravacao = {
  name: string;
  valueChars: number;
};

@Injectable()
export class VaultService {
  private readonly registros = new Map<string, Ciphertext>();

  constructor(private readonly audit: AuditService) {}

  async guardar(
    identidade: IdentidadeRequisicao,
    name: VaultName,
    value: SecretValue,
  ): Promise<void> {
    const key = this.chave();
    const blob = seal(key, value);
    await this.audit.registrar(this.linha(identidade, name, value));
    this.registros.set(this.slot(identidade, name), blob);
  }

  async ler(identidade: IdentidadeRequisicao, name: VaultName): Promise<SecretValue> {
    const key = this.chave();
    const blob = this.registros.get(this.slot(identidade, name));
    if (!blob) {
      throw new NotFoundException("Segredo não encontrado.");
    }
    const plain = open(key, blob);
    if (plain === null) {
      throw new ServiceUnavailableException("Cofre indisponível.");
    }
    return plain as SecretValue;
  }

  private chave(): Buffer {
    const key = deriveVaultKey(process.env.HUB_VAULT_KEY);
    if (!key) {
      throw new ServiceUnavailableException("Cofre indisponível.");
    }
    return key;
  }

  private slot(identidade: IdentidadeRequisicao, name: VaultName): string {
    return `${identidade.officeId}\u0000${identidade.id}\u0000${name}`;
  }

  private linha(
    identidade: IdentidadeRequisicao,
    name: VaultName,
    value: SecretValue,
  ): RegistroAuditoria {
    const argumentos: ArgsDeGravacao = {
      name,
      valueChars: value.length,
    };
    return {
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "vault_secret",
      argumentos,
      decisao: "permitido",
      motivo: "vault_store",
      omitido: ["value"],
      duracaoMs: 0,
    };
  }
}
