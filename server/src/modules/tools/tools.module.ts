import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { PrazosService } from "./prazos.service";
import { ToolsController } from "./tools.controller";

@Module({
  imports: [DbModule],
  controllers: [ToolsController],
  providers: [PrazosService],
})
export class ToolsModule {}
