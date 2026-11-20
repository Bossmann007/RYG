import { IsNotEmpty, IsString } from "class-validator";

export class AbrirDmDto {
  @IsString()
  @IsNotEmpty()
  peerUserId!: string;
}

export class EnviarMensagemDmDto {
  @IsString()
  body!: string;
}
