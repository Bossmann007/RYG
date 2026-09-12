import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { McpService } from "./mcp.service";

@Module({
  imports: [GatewayModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
