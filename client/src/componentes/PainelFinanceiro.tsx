import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  criarLancamento,
  FinanceiroCaso,
  gerarFatura,
  Lancamento,
  listarLancamentos,
  NovoLancamento,
  substituirLancamento,
} from "../api";

const ROTULO_KIND: Record<Lancamento["kind"], string> = {
  honorario: "Honorário",
  custa: "Custa",
  fatura: "Fatura",
};

const ROTULO_STATUS: Record<Lancamento["status"], string> = {
  rascunho: "Rascunho",
  lancado: "Lançado",
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarCentavos(centavos: number): string {
  return BRL.format(centavos / 100);
}

/** "1.234,5" is rejected: thousands separators are ambiguous with the decimal comma. */
function lerCentavos(reais: string): number | null {
  const casado = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(reais.trim());
  if (!casado) {
    return null;
  }
  const centavos = Number(casado[1]) * 100 + Number((casado[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

export function PainelFinanceiro({ casoId }: { casoId: string }) {
  const [dados, setDados] = useState<FinanceiroCaso | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [kind, setKind] = useState<NovoLancamento["kind"]>("honorario");
  const [status, setStatus] = useState<NovoLancamento["status"]>("rascunho");
  const [descricao, setDescricao] = useState("");
  const [reais, setReais] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setDados(await listarLancamentos(casoId));
  }, [casoId]);

  useEffect(() => {
    let vivo = true;
    setDados(null);
    setErro(null);
    listarLancamentos(casoId)
      .then((resposta) => {
        if (vivo) {
          setDados(resposta);
        }
      })
      .catch((falha: unknown) => {
        if (vivo) {
          setErro(falha instanceof Error ? falha.message : "Financeiro indisponível.");
        }
      });
    return () => {
      vivo = false;
    };
  }, [casoId]);

  async function executar(acao: () => Promise<void>) {
    setErro(null);
    setEnviando(true);
    try {
      await acao();
      await carregar();
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Operação recusada.");
    } finally {
      setEnviando(false);
    }
  }

  function lancar(evento: FormEvent) {
    evento.preventDefault();
    const centavos = lerCentavos(reais);
    if (centavos === null) {
      setErro("Valor em reais com no máximo 2 casas decimais, por exemplo 1500,50.");
      return;
    }
    const novo = { kind, descricao: descricao.trim(), centavos, status };
    void executar(async () => {
      if (editandoId) {
        await substituirLancamento(casoId, editandoId, novo);
        setEditandoId(null);
      } else {
        await criarLancamento(casoId, novo);
      }
      setDescricao("");
      setReais("");
    });
  }

  function editar(item: Lancamento) {
    setEditandoId(item.id);
    setKind(item.kind === "custa" ? "custa" : "honorario");
    setStatus(item.status);
    setDescricao(item.descricao);
    setReais((item.centavos / 100).toFixed(2).replace(".", ","));
    setErro(null);
  }

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Financeiro</h3>
        <p>Honorários, custas e faturas deste caso, em reais. Lançado ou faturado não muda mais.</p>
      </header>

      {dados ? (
        <article className="cartao-suave">
          <p className="olho">Em aberto</p>
          <strong>{formatarCentavos(dados.abertoCentavos)}</strong>
        </article>
      ) : null}

      {dados?.podeLancar ? (
        <form className="cartao-suave" onSubmit={lancar}>
          <p className="olho">{editandoId ? "Substituir rascunho" : "Novo lançamento"}</p>
          <select value={kind} onChange={(evento) => setKind(evento.target.value as NovoLancamento["kind"])}>
            <option value="honorario">Honorário</option>
            <option value="custa">Custa</option>
          </select>
          <input
            type="text"
            placeholder="Descrição"
            maxLength={160}
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            required
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Valor em R$"
            value={reais}
            onChange={(evento) => setReais(evento.target.value)}
            required
          />
          <select value={status} onChange={(evento) => setStatus(evento.target.value as NovoLancamento["status"])}>
            <option value="rascunho">Rascunho</option>
            <option value="lancado">Lançado</option>
          </select>
          <button className="voltar" type="submit" disabled={enviando}>
            {editandoId ? "Substituir" : "Lançar"}
          </button>
          {editandoId ? (
            <button
              className="voltar"
              type="button"
              disabled={enviando}
              onClick={() => {
                setEditandoId(null);
                setDescricao("");
                setReais("");
              }}
            >
              Cancelar
            </button>
          ) : null}
          <button
            className="voltar"
            type="button"
            disabled={
              enviando ||
              !dados.lancamentos.some(
                (item) => item.kind !== "fatura" && item.status === "lancado" && !item.faturaId,
              )
            }
            onClick={() => void executar(() => gerarFatura(casoId))}
          >
            Gerar fatura
          </button>
        </form>
      ) : null}

      {erro ? <p className="vazio">{erro}</p> : null}
      {dados && dados.lancamentos.length === 0 ? <p className="vazio">Nenhum lançamento.</p> : null}
      <ul className="lista-docs">
        {(dados?.lancamentos ?? []).map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.descricao}</strong>
              <p>
                {formatarCentavos(item.centavos)} · {new Date(item.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="selos">
              <span className="selo neutro">{ROTULO_KIND[item.kind]}</span>
              <span className="selo neutro">{ROTULO_STATUS[item.status]}</span>
              {item.faturaId ? <span className="selo neutro">Faturado</span> : null}
              {dados?.podeLancar && item.status === "rascunho" && !item.faturaId ? (
                <button className="voltar" type="button" disabled={enviando} onClick={() => editar(item)}>
                  Editar
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
