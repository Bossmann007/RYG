import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const TEXTO_CURTO = 200;
const TEXTO_LONGO = 1000;

export class ListarContratosQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO, { message: "casoId deve ter no máximo 200 caracteres." })
  casoId?: string;
}

export class CreateContratoDto {
  @IsString()
  @IsNotEmpty({ message: "casoId é obrigatório." })
  @MaxLength(TEXTO_CURTO, { message: "casoId deve ter no máximo 200 caracteres." })
  casoId: string;

  @IsString()
  @IsNotEmpty({ message: "titulo é obrigatório." })
  @MaxLength(TEXTO_CURTO, { message: "titulo deve ter no máximo 200 caracteres." })
  titulo: string;

  /** Livre de propósito: o front só renderiza, não há enum a respeitar ainda. */
  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO, { message: "tipo deve ter no máximo 200 caracteres." })
  tipo?: string;

  @IsString()
  @IsNotEmpty({ message: "data é obrigatória." })
  @MaxLength(TEXTO_CURTO, { message: "data deve ter no máximo 200 caracteres." })
  data: string;

  @IsString()
  @IsNotEmpty({ message: "origem é obrigatória." })
  @MaxLength(TEXTO_CURTO, { message: "origem deve ter no máximo 200 caracteres." })
  origem: string;

  @IsString()
  @IsNotEmpty({ message: "resumo é obrigatório." })
  @MaxLength(TEXTO_LONGO, { message: "resumo deve ter no máximo 1000 caracteres." })
  resumo: string;
}

export class UpdateContratoDto {
  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO, { message: "titulo deve ter no máximo 200 caracteres." })
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO, { message: "tipo deve ter no máximo 200 caracteres." })
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO, { message: "data deve ter no máximo 200 caracteres." })
  data?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO, { message: "origem deve ter no máximo 200 caracteres." })
  origem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_LONGO, { message: "resumo deve ter no máximo 1000 caracteres." })
  resumo?: string;
}
