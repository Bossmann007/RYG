import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { XirpController } from "./xirp.controller";
import { XirpRunsService } from "./xirp-runs.service";

@Module({
  imports: [DbModule],
  controllers: [XirpController],
  providers: [XirpRunsService],
  exports: [XirpRunsService],
})
export class XirpModule {}
