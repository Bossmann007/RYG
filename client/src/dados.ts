import { ACERVO_REAL } from "./acervo-real";
import { aplicarPoliticaAntiAlucinacao } from "./politica-caso";
import { Caso, MembroEquipe } from "./tipos";

export const ESCRITORIO = {
  nome: "Zhegga Advogados Associados",
  usuario: "Gustavo Vilela",
  papel: "Advogado",
  iniciais: "GV",
};

/** Quem pode ser marcado com @ nos canais dos casos. */
export const EQUIPE: MembroEquipe[] = [
  { id: "ana", nome: "Ana Prado", papel: "Sócia", iniciais: "AP" },
  { id: "marina", nome: "Marina Costa", papel: "Advogada", iniciais: "MC" },
  { id: "joao", nome: "João Lima", papel: "Estagiário", iniciais: "JL" },
];

/**
 * Cópia do acervo do TiDB, gerada por `npm run gerar:acervo`.
 * A tela só cai aqui quando a API do Nest não responde.
 */
export const CASOS: Caso[] = ACERVO_REAL.map(aplicarPoliticaAntiAlucinacao);

export function buscarCaso(id: string) {
  return CASOS.find((caso) => caso.id === id);
}
