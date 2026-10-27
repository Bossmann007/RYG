import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

export class AbrirDmDto {
  @IsString()
  @IsNotEmpty({ message: "peerUserId é obrigatório." })
  @MaxLength(64, { message: "peerUserId inválido." })
  peerUserId: string;
}

export class CriarMensagemWorkspaceDto {
  @IsUUID("4", { message: "id deve ser um UUID v4." })
  id: string;

  @IsString()
  @IsNotEmpty({ message: "mensagem é obrigatória." })
  @MaxLength(8000, { message: "mensagem deve ter no máximo 8000 caracteres." })
  mensagem: string;
}

export class ListarWorkspaceQueryDto {
  @IsOptional()
  @Matches(/^\d+$/, { message: "limite deve ser um número inteiro." })
  limite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512, { message: "cursor inválido." })
  cursor?: string;
}
