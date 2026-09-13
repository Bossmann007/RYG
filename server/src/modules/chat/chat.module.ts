import { DbModule } from "@modules/db/db.module";
import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [DbModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
