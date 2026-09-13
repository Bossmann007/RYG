import { Module } from "@nestjs/common";
import { DbModule } from "@modules/db/db.module";
import { ContractsController } from "./contracts.controller";
import { ContratosMemoryRepository } from "./contracts.memory.repository";
import { ContratosRepository } from "./contracts.repository";
import { ContractsService } from "./contracts.service";

@Module({
  imports: [DbModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    { provide: ContratosRepository, useClass: ContratosMemoryRepository },
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
