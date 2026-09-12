import { ProcessController } from "@modules/process/process.controller";
import { ProcessService } from "@modules/process/process.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [ProcessController],
  providers: [ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}
