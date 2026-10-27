import { DbModule } from "@modules/db/db.module";
import { GatewayModule } from "@modules/gateway/gateway.module";
import { Module } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";

@Module({
  imports: [DbModule, GatewayModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
