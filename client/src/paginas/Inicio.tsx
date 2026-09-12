import { FormEvent, useState } from "react";
import { NUMERO_PROCESSO_DEMO } from "../tipos";

type Props = {
  enviando: boolean;
  erro: string;
  onPesquisar: (numero: string, nomeArquivo?: string) => void;
};

export function Inicio({ enviando, erro, onPesquisar }: Props) {
  const [aba, setAba] = useState<"numero" | "importar">("numero");
  const [numero, setNumero] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    onPesquisar(numero, aba === "importar" ? nomeArquivo : undefined);
  }

  return (
    <section className="bloco busca">
      <h2 className="titulo-secao">Pesquisa</h2>

      <div className="abas">
        <button
          className={aba === "numero" ? "aba ativa" : "aba"}
          type="button"
          onClick={() => setAba("numero")}
        >
          Número do processo
        </button>
        <button
          className={aba === "importar" ? "aba ativa" : "aba"}
          type="button"
          onClick={() => setAba("importar")}
        >
          Importar + número
        </button>
      </div>

      <form className="formulario" onSubmit={enviar}>
        <p className="ajuda">
          O número do processo é obrigatório nos dois modos.
        </p>

        <label className="campo">
          Numeração processual
          <input
            type="text"
            value={numero}
            onChange={(evento) => setNumero(evento.target.value)}
            placeholder="9000064-42.2023.8.26.0100"
            required
          />
        </label>

        {aba === "importar" && (
          <label className="campo">
            Documento
            <input
              type="file"
              onChange={(evento) =>
                setNomeArquivo(evento.target.files?.[0]?.name || "")
              }
            />
          </label>
        )}

        {erro && <p className="erro">{erro}</p>}

        <div className="acoes">
          <button className="botao" type="submit" disabled={enviando}>
            {enviando ? "Pesquisando…" : "Pesquisar"}
          </button>
          <button
            className="botao secundario"
            type="button"
            onClick={() => setNumero(NUMERO_PROCESSO_DEMO)}
          >
            Preencher caso bancário
          </button>
        </div>
      </form>
    </section>
  );
}
