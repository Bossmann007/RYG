import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { termoDiasUteis } from "./prazo-cpc";

@Controller("tools")
export class PrazoCpcController {
  @Post("prazo-cpc")
  @HttpCode(HttpStatus.OK)
  calcular(@Body() body: { inicio?: string; dias?: number }) {
    const inicio = String(body?.inicio ?? "").trim();
    const dias = Number(body?.dias);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !Number.isInteger(dias) || dias < 1 || dias > 365) {
      throw new BadRequestException("inicio YYYY-MM-DD e dias inteiros de 1 a 365 são obrigatórios.");
    }

    let termo: string;
    try {
      termo = termoDiasUteis(inicio, dias);
    } catch {
      throw new BadRequestException("inicio YYYY-MM-DD e dias inteiros de 1 a 365 são obrigatórios.");
    }

    return {
      zone: "internal" as const,
      termo,
      diasUteis: dias,
      regra: "CPC art. 219",
    };
  }
}
