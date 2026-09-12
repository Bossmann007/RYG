import { JurisprudenciaFixture } from "@models/jurisprudencia.model";
import { JURISPRUDENCIAS_BANCARIAS } from "../../fixtures/jurisprudencias";
import { Injectable } from "@nestjs/common";

@Injectable()
export class JurisprudenceService {
  buscarRelacionadas(assuntos: string[]): JurisprudenciaFixture[] {
    const chaves = (assuntos || []).map((item) => item.toLowerCase());

    return JURISPRUDENCIAS_BANCARIAS.filter((item) =>
      item.relatedSubjects.some((assunto) =>
        chaves.includes(assunto.toLowerCase())
      )
    );
  }
}
