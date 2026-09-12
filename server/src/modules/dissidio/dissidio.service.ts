import {
  Alinhamento,
  Jurisprudencia,
  JurisprudenciaFixture,
} from "@models/jurisprudencia.model";
import {
  RelatorioChance,
  RelatorioDissidio,
} from "@models/pesquisa.model";
import { Processo } from "@models/processo.model";
import { Injectable } from "@nestjs/common";

const ROTULO_ORIENTACAO = {
  rejeita_revisao: "Rejeita a revisão (linha contratualista)",
  aceita_revisao: "Aceita a revisão (afasta tarifa e/ou seguro)",
};

@Injectable()
export class DissidioService {
  classificar(
    processo: Processo,
    itens: JurisprudenciaFixture[]
  ): Jurisprudencia[] {
    return itens.map((item) => {
      const citeStatus =
        item.ementaSnippet && item.orientation ? "ok" : "unavailable";

      return {
        ...item,
        citeStatus,
        alignment: this.classificarAlinhamento(processo, item, citeStatus),
      };
    });
  }

  montarRelatorioDissidio(
    processo: Processo,
    itens: Jurisprudencia[]
  ): RelatorioDissidio {
    const conflicts = itens.map((item) => ({
      chamber: item.chamber,
      court: item.court,
      orientationLabel: item.orientation
        ? ROTULO_ORIENTACAO[item.orientation]
        : "Sem voto / ementa na fonte (cite indisponível)",
      vsProcessChamber: item.alignment,
      note: this.notaLinha(processo, item),
    }));

    const divergeCount = itens.filter((item) => item.alignment === "diverge")
      .length;
    const forCount = itens.filter((item) => item.alignment === "for").length;
    const unknownCount = itens.filter((item) => item.alignment === "unknown")
      .length;

    const narrative = [
      `A ${processo.chamber} do ${processo.court} — câmara do processo do advogado — tem esta orientação predominante: ${ROTULO_ORIENTACAO[processo.chamberOrientation]}.`,
      `Foram cruzadas ${itens.length} jurisprudências fictícias. ${forCount} caminham com a câmara do caso, ${divergeCount} divergem de câmara e de resultado${unknownCount ? `, ${unknownCount} sem ementa citável` : ""}.`,
      divergeCount > 0
        ? "Há dissídio útil: outras câmaras do mesmo tribunal afastam tarifa e/ou seguro prestamista. Isso não muda sozinho o órgão do recurso, mas alimenta distinção e blindagem."
        : "Não há dissídio de câmara nas fixtures desta consulta.",
    ].join(" ");

    return { narrative, conflicts };
  }

  montarRelatorioChance(
    processo: Processo,
    itens: Jurisprudencia[]
  ): RelatorioChance {
    const forCount = itens.filter((item) => item.alignment === "for").length;
    const divergeCount = itens.filter((item) => item.alignment === "diverge")
      .length;
    const againstCount = itens.filter((item) => item.alignment === "against")
      .length;

    let score = 38 + divergeCount * 8 + againstCount * 4 - forCount * 5;
    score = Math.min(85, Math.max(15, score));

    const label =
      score >= 60
        ? "Chance razoável"
        : score >= 40
          ? "Chance moderada"
          : "Chance baixa na câmara do caso";

    const rationale = [
      `Heurística de demo (não é previsão estatística). O advogado atua pelo consumidor. A ${processo.chamber} rejeita, em regra, a revisão quando a tarifa está no contrato.`,
      `Pontuação ${score}/100: a linha da própria câmara e do STJ pesam contra o pedido principal; o dissídio de outras câmaras sobe um pouco a nota porque abre distinção no seguro e, em parte, na tarifa.`,
    ].join(" ");

    return {
      score,
      label,
      rationale,
      blindagem: this.montarBlindagem(processo, itens),
    };
  }

  private classificarAlinhamento(
    processo: Processo,
    item: JurisprudenciaFixture,
    citeStatus: "ok" | "unavailable"
  ): Alinhamento {
    if (citeStatus === "unavailable" || !item.orientation || !item.ementaSnippet) {
      return "unknown";
    }

    const mesmaCamara =
      this.normalizar(item.chamber) === this.normalizar(processo.chamber);
    const mesmaOrientacao = item.orientation === processo.chamberOrientation;

    if (mesmaOrientacao) {
      return "for";
    }

    if (!mesmaCamara) {
      return "diverge";
    }

    return "against";
  }

  private notaLinha(processo: Processo, item: Jurisprudencia): string {
    if (item.alignment === "unknown") {
      return "Ementa ausente na fixture — cite marcada como indisponível (cite-or-silent).";
    }

    if (item.alignment === "for") {
      return `Alinha com a ${processo.chamber}: mesmo sentido de voto.`;
    }

    if (item.alignment === "diverge") {
      return `Dissídio: ${item.chamber} decide diferente da câmara do processo.`;
    }

    return "Mesma câmara, resultado oposto à linha predominante.";
  }

  private montarBlindagem(processo: Processo, itens: Jurisprudencia[]): string[] {
    const pontos = [
      `A contraparte (banco) deve citar a própria ${processo.chamber} e a 2ª Seção do STJ para sustentar a tarifa de cadastro pactuada.`,
      "Separe as teses: tarifa de cadastro (terreno mais difícil nesta câmara) e seguro prestamista (há voto de outra câmara a favor da restituição).",
    ];

    for (const item of itens) {
      if (item.alignment === "diverge" && item.voteSummary) {
        pontos.push(
          `Use ${item.court} ${item.chamber} só como distinção, não como se fosse a linha da câmara do caso: ${item.voteSummary}`
        );
      }

      if (item.alignment === "unknown") {
        pontos.push(
          `${item.court} ${item.chamber} apareceu na busca, mas sem ementa — não cite. Peça a peça oficial depois.`
        );
      }
    }

    pontos.push(
      "Blindagem prática: antecipar na razão de apelação a resposta à linha contratualista, em vez de só juntar acórdãos divergentes."
    );

    return pontos;
  }

  private normalizar(valor: string): string {
    return valor.trim().toLowerCase();
  }
}
