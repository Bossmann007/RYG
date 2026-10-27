import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { WikiController } from "./wiki.controller";
import { WikiService } from "./wiki.service";

@Module({
  imports: [DbModule],
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService],
})
export class WikiModule {}
