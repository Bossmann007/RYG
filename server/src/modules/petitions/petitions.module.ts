import { ClientsModule } from "@modules/clients/clients.module";
import { DbModule } from "@modules/db/db.module";
import { ProcessModule } from "@modules/process/process.module";
import { Module } from "@nestjs/common";
import { PetitionsController } from "./petitions.controller";
import { PetitionsService } from "./petitions.service";

@Module({
  imports: [ClientsModule, ProcessModule, DbModule],
  controllers: [PetitionsController],
  providers: [PetitionsService],
  exports: [PetitionsService],
})
export class PetitionsModule {}
