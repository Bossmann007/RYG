import { Module } from "@nestjs/common";
import { PrazoCpcController } from "./prazo-cpc.controller";

@Module({
  controllers: [PrazoCpcController],
})
export class ToolsModule {}
