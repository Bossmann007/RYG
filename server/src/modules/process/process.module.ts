import { GatewayModule } from "@modules/gateway/gateway.module";
import { ProcessController } from "@modules/process/process.controller";
import { ProcessService } from "@modules/process/process.service";
import { Module, forwardRef } from "@nestjs/common";

@Module({
  imports: [forwardRef(() => GatewayModule)],
  controllers: [ProcessController],
  providers: [ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}
