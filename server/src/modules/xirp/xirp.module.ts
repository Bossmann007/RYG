import { CasosModule } from "@modules/casos/casos.module";
import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { XirpController } from "./xirp.controller";
import { XirpService } from "./xirp.service";

@Module({
  imports: [DbModule, CasosModule],
  controllers: [XirpController],
  providers: [XirpService],
  exports: [XirpService],
})
export class XirpModule {}
