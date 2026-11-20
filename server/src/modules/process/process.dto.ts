import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class BuscarProcessoDto {
  @IsString()
  @IsNotEmpty({ message: "O número do processo é obrigatório." })
  processNumber: string;
}

export class RegistrarManualDto {
  @IsString()
  @IsNotEmpty({ message: "O número do processo é obrigatório." })
  processNumber: string;

  @IsOptional()
  @IsString()
  court?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}
