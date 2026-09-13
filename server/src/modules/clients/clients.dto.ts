import { CLIENTE_KINDS, CLIENTE_STATUSES } from "@models/cliente.model";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ListarClientesQueryDto {
  @IsOptional()
  @IsString()
  casoId?: string;

  @IsOptional()
  @IsString()
  processNumber?: string;
}

export class CreateClienteDto {
  @IsString()
  @MinLength(2, { message: "O nome de exibição precisa ter ao menos 2 caracteres." })
  @MaxLength(80, { message: "O nome de exibição deve ter no máximo 80 caracteres." })
  displayName: string;

  @IsIn([...CLIENTE_KINDS], { message: "kind deve ser pessoa_fisica ou pessoa_juridica." })
  kind: (typeof CLIENTE_KINDS)[number];

  @IsOptional()
  @IsIn([...CLIENTE_STATUSES], { message: "status deve ser ativo ou encerrado." })
  status?: (typeof CLIENTE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(280, { message: "notes deve ter no máximo 280 caracteres." })
  notes?: string;
}

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "O nome de exibição precisa ter ao menos 2 caracteres." })
  @MaxLength(80, { message: "O nome de exibição deve ter no máximo 80 caracteres." })
  displayName?: string;

  @IsOptional()
  @IsIn([...CLIENTE_KINDS], { message: "kind deve ser pessoa_fisica ou pessoa_juridica." })
  kind?: (typeof CLIENTE_KINDS)[number];

  @IsOptional()
  @IsIn([...CLIENTE_STATUSES], { message: "status deve ser ativo ou encerrado." })
  status?: (typeof CLIENTE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(280, { message: "notes deve ter no máximo 280 caracteres." })
  notes?: string;
}
