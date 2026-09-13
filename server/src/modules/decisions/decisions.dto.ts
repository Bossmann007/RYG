import {
  DECISAO_KINDS,
  DECISAO_OUTCOMES,
  DECISAO_STATUSES,
} from "@models/decisao.model";
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDecisaoDto {
  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: "clienteId inválido." })
  clienteId?: string;

  @IsString()
  @MinLength(3, { message: "O título precisa ter ao menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter no máximo 120 caracteres." })
  title: string;

  @IsIn([...DECISAO_KINDS], { message: "kind de decisão inválido." })
  kind: (typeof DECISAO_KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: "court deve ter no máximo 80 caracteres." })
  court?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: "chamber deve ter no máximo 80 caracteres." })
  chamber?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "decidedAt deve ser uma data ISO." })
  decidedAt?: string;

  @IsOptional()
  @IsIn([...DECISAO_OUTCOMES], { message: "outcome de decisão inválido." })
  outcome?: (typeof DECISAO_OUTCOMES)[number];

  @IsString()
  @MinLength(8, { message: "O resumo precisa ter ao menos 8 caracteres." })
  @MaxLength(500, { message: "O resumo deve ter no máximo 500 caracteres." })
  summary: string;

  @IsOptional()
  @IsIn([...DECISAO_STATUSES], { message: "status deve ser rascunho, publicada ou transitada." })
  status?: (typeof DECISAO_STATUSES)[number];
}

export class UpdateDecisaoDto {
  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: "O título precisa ter ao menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter no máximo 120 caracteres." })
  title?: string;

  @IsOptional()
  @IsIn([...DECISAO_KINDS], { message: "kind de decisão inválido." })
  kind?: (typeof DECISAO_KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: "court deve ter no máximo 80 caracteres." })
  court?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: "chamber deve ter no máximo 80 caracteres." })
  chamber?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "decidedAt deve ser uma data ISO." })
  decidedAt?: string;

  @IsOptional()
  @IsIn([...DECISAO_OUTCOMES], { message: "outcome de decisão inválido." })
  outcome?: (typeof DECISAO_OUTCOMES)[number];

  @IsOptional()
  @IsString()
  @MinLength(8, { message: "O resumo precisa ter ao menos 8 caracteres." })
  @MaxLength(500, { message: "O resumo deve ter no máximo 500 caracteres." })
  summary?: string;

  @IsOptional()
  @IsIn([...DECISAO_STATUSES], { message: "status deve ser rascunho, publicada ou transitada." })
  status?: (typeof DECISAO_STATUSES)[number];
}

export class ListarDecisoesQueryDto {
  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsIn([...DECISAO_KINDS], { message: "kind de decisão inválido." })
  kind?: (typeof DECISAO_KINDS)[number];
}
