import { Module } from "@nestjs/common";
import { AcervoQuery } from "./acervo.query";
import { DbService } from "./db.service";

@Module({
  providers: [DbService, AcervoQuery],
  exports: [DbService, AcervoQuery],
})
export class DbModule {}
