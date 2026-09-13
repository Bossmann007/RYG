import { ContractsController } from "@modules/contracts/contracts.controller";
import { ContratosMemoryRepository } from "@modules/contracts/contracts.memory.repository";
import { ContratosRepository } from "@modules/contracts/contracts.repository";
import { ContractsService } from "@modules/contracts/contracts.service";
import { Module } from "@nestjs/common";

/**
 * O unico lugar que sabe de onde vem o contrato.
 *
 * Trocar a fixture pelo banco e trocar a classe apontada por `useClass` aqui.
 * Nada mais no modulo importa a implementacao concreta — sempre a classe
 * abstrata — entao o resto nao precisa nem ser lido no dia da troca.
 */
@Module({
  controllers: [ContractsController],
  providers: [
    ContractsService,
    { provide: ContratosRepository, useClass: ContratosMemoryRepository },
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
