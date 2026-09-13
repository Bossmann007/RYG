import { PETICAO_KINDS, PETICAO_STATUSES } from "@models/peticao.model";
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreatePeticaoDto {
  @IsString()
  @MinLength(3, { message: "clienteId é obrigatório." })
  clienteId: string;

  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsString()
  @MinLength(3, { message: "O título precisa ter ao menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter no máximo 120 caracteres." })
  title: string;

  @IsIn([...PETICAO_KINDS], { message: "kind de petição inválido." })
  kind: (typeof PETICAO_KINDS)[number];

  @IsOptional()
  @IsIn([...PETICAO_STATUSES], { message: "status deve ser rascunho, protocolada ou juntada." })
  status?: (typeof PETICAO_STATUSES)[number];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "filedAt deve ser uma data YYYY-MM-DD." })
  filedAt?: string;

  @IsString()
  @MinLength(8, { message: "O resumo precisa ter ao menos 8 caracteres." })
  @MaxLength(500, { message: "O resumo deve ter no máximo 500 caracteres." })
  summary: string;
}

export class UpdatePeticaoDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "clienteId é obrigatório." })
  clienteId?: string;

  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: "O título precisa ter ao menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter no máximo 120 caracteres." })
  title?: string;

  @IsOptional()
  @IsIn([...PETICAO_KINDS], { message: "kind de petição inválido." })
  kind?: (typeof PETICAO_KINDS)[number];

  @IsOptional()
  @IsIn([...PETICAO_STATUSES], { message: "status deve ser rascunho, protocolada ou juntada." })
  status?: (typeof PETICAO_STATUSES)[number];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "filedAt deve ser uma data YYYY-MM-DD." })
  filedAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: "O resumo precisa ter ao menos 8 caracteres." })
  @MaxLength(500, { message: "O resumo deve ter no máximo 500 caracteres." })
  summary?: string;
}

export class ListarPeticoesQueryDto {
  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  processNumber?: string;
}
