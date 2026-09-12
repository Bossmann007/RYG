import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ResearchDto {
  @IsString()
  @IsNotEmpty({ message: "O número do processo é obrigatório." })
  processNumber: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}
