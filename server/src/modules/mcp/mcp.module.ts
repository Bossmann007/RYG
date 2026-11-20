import { CasosModule } from "@modules/casos/casos.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { XirpModule } from "@modules/xirp/xirp.module";
import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";

@Module({
  imports: [GatewayModule, XirpModule, CasosModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
