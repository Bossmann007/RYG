import { MODELO_AREAS, MODELO_KINDS, MODELO_STATUSES } from "@models/modelo.model";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateModeloDto {
  @IsString()
  @MinLength(3, { message: "O título precisa ter ao menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter no máximo 120 caracteres." })
  title: string;

  @IsIn([...MODELO_KINDS], { message: "kind de modelo inválido." })
  kind: (typeof MODELO_KINDS)[number];

  @IsOptional()
  @IsIn([...MODELO_AREAS], { message: "area de modelo inválida." })
  area?: (typeof MODELO_AREAS)[number];

  @IsString()
  @MinLength(8, { message: "O corpo precisa ter ao menos 8 caracteres." })
  @MaxLength(8000, { message: "O corpo deve ter no máximo 8000 caracteres." })
  body: string;

  @IsOptional()
  @IsArray({ message: "tags deve ser uma lista." })
  @IsString({ each: true, message: "cada tag deve ser texto." })
  @MaxLength(40, { each: true, message: "cada tag deve ter no máximo 40 caracteres." })
  tags?: string[];

  @IsOptional()
  @IsIn([...MODELO_STATUSES], { message: "status deve ser ativo ou arquivado." })
  status?: (typeof MODELO_STATUSES)[number];
}

export class UpdateModeloDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "O título precisa ter ao menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter no máximo 120 caracteres." })
  title?: string;

  @IsOptional()
  @IsIn([...MODELO_KINDS], { message: "kind de modelo inválido." })
  kind?: (typeof MODELO_KINDS)[number];

  @IsOptional()
  @IsIn([...MODELO_AREAS], { message: "area de modelo inválida." })
  area?: (typeof MODELO_AREAS)[number];

  @IsOptional()
  @IsString()
  @MinLength(8, { message: "O corpo precisa ter ao menos 8 caracteres." })
  @MaxLength(8000, { message: "O corpo deve ter no máximo 8000 caracteres." })
  body?: string;

  @IsOptional()
  @IsArray({ message: "tags deve ser uma lista." })
  @IsString({ each: true, message: "cada tag deve ser texto." })
  @MaxLength(40, { each: true, message: "cada tag deve ter no máximo 40 caracteres." })
  tags?: string[];

  @IsOptional()
  @IsIn([...MODELO_STATUSES], { message: "status deve ser ativo ou arquivado." })
  status?: (typeof MODELO_STATUSES)[number];
}

export class ListarModelosQueryDto {
  @IsOptional()
  @IsIn([...MODELO_KINDS], { message: "kind de modelo inválido." })
  kind?: (typeof MODELO_KINDS)[number];

  @IsOptional()
  @IsIn([...MODELO_AREAS], { message: "area de modelo inválida." })
  area?: (typeof MODELO_AREAS)[number];

  @IsOptional()
  @IsIn([...MODELO_STATUSES], { message: "status deve ser ativo ou arquivado." })
  status?: (typeof MODELO_STATUSES)[number];

  @IsOptional()
  @IsString()
  casoId?: string;

  @IsOptional()
  @IsString()
  processNumber?: string;
}
