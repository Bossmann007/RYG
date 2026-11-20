import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { BlobCifrado, chaveEnvelope, cifrar, decifrar } from "./vault.crypto";

/**
 * In-memory ciphertext only. The plaintext never sits in the map.
 * HUB_VAULT_KEY is the envelope passphrase. Do not commit a real value.
 */
@Injectable()
export class VaultService {
  private readonly itens = new Map<string, BlobCifrado>();

  chavePronta(): boolean {
    return chaveEnvelope() !== null;
  }

  gravar(officeId: string, userId: string, name: string, value: string): void {
    const chave = this.exigirChave();
    this.itens.set(this.rotulo(officeId, userId, name), cifrar(value, chave));
  }

  ler(officeId: string, userId: string, name: string): string | null {
    const chave = this.exigirChave();
    const blob = this.itens.get(this.rotulo(officeId, userId, name));
    if (!blob) {
      return null;
    }
    return decifrar(blob, chave);
  }

  private exigirChave(): Buffer {
    const chave = chaveEnvelope();
    if (!chave) {
      throw new ServiceUnavailableException("Cofre indisponível.");
    }
    return chave;
  }

  private rotulo(officeId: string, userId: string, name: string): string {
    return `${officeId}\0${userId}\0${name}`;
  }
}
