import { IsNotEmpty, IsString } from "class-validator";

export class BuscarProcessoDto {
  @IsString()
  @IsNotEmpty({ message: "O número do processo é obrigatório." })
  processNumber: string;
}
