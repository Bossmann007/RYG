import { CasosModule } from "@modules/casos/casos.module";
import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";

@Module({
  imports: [DbModule, CasosModule],
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}
