import { ClientsModule } from "@modules/clients/clients.module";
import { ProcessModule } from "@modules/process/process.module";
import { Module } from "@nestjs/common";
import { DecisionsController } from "./decisions.controller";
import { DecisionsService } from "./decisions.service";

@Module({
  imports: [ClientsModule, ProcessModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
