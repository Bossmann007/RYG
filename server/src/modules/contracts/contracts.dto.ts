import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const TEXTO_CURTO = 200;
const TEXTO_LONGO = 1000;

export class ListarContratosDto {
  @IsString()
  @IsNotEmpty({ message: "casoId e obrigatorio" })
  @MaxLength(TEXTO_CURTO)
  casoId: string;
}

export class CriarContratoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXTO_CURTO)
  casoId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXTO_CURTO)
  titulo: string;

  /** Livre de proposito: o front so renderiza, nao ha enum a respeitar ainda. */
  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO)
  tipo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXTO_CURTO)
  data: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXTO_CURTO)
  origem: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXTO_LONGO)
  resumo: string;
}

export class EditarContratoDto {
  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO)
  data?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_CURTO)
  origem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXTO_LONGO)
  resumo?: string;
}
