import { ClientsModule } from "@modules/clients/clients.module";
import { ProcessModule } from "@modules/process/process.module";
import { Module } from "@nestjs/common";
import { PetitionsController } from "./petitions.controller";
import { PetitionsService } from "./petitions.service";

@Module({
  imports: [ClientsModule, ProcessModule],
  controllers: [PetitionsController],
  providers: [PetitionsService],
  exports: [PetitionsService],
})
export class PetitionsModule {}
