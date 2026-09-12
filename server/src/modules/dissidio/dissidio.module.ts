import { DissidioController } from "@modules/dissidio/dissidio.controller";
import { DissidioService } from "@modules/dissidio/dissidio.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [DissidioController],
  providers: [DissidioService],
  exports: [DissidioService],
})
export class DissidioModule {}
