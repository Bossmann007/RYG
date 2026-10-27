import { FormEvent, useEffect, useState } from "react";
import {
  HardvaultHit,
  WikiNote,
  WikiNoteResumo,
  buscarHardvault,
  criarNotaWiki,
  listarNotasWiki,
  obterNotaWiki,
  publicarNotaWiki,
} from "../api";

type Props = {
  onVoltar: () => void;
};

export function WikiVault({ onVoltar }: Props) {
  const [notas, setNotas] = useState<WikiNoteResumo[]>([]);
  const [ativa, setAtiva] = useState<WikiNote | null>(null);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [hits, setHits] = useState<HardvaultHit[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [confirmPublish, setConfirmPublish] = useState(false);

  async function recarregarNotas() {
    const lista = await listarNotasWiki();
    setNotas(lista);
  }

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    Promise.all([listarNotasWiki(), buscarHardvault("")])
      .then(([lista, hard]) => {
        if (cancelado) return;
        setNotas(lista);
        setHits(hard);
      })
      .catch((falha) => {
        if (!cancelado) {
          setErro(falha instanceof Error ? falha.message : "Wiki indisponível.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function abrirNota(id: string) {
    setErro("");
    setConfirmPublish(false);
    const nota = await obterNotaWiki(id);
    setAtiva(nota);
    setTitulo(nota.title);
    setCorpo(nota.bodyMd);
  }

  async function salvarNova(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setInfo("");
    try {
      const nota = await criarNotaWiki(titulo || "Sem título", corpo);
      setAtiva(nota);
      setTitulo(nota.title);
      setCorpo(nota.bodyMd);
      await recarregarNotas();
      setInfo("Nota pessoal salva (só você vê).");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao salvar.");
    }
  }

  async function publicar() {
    if (!ativa) return;
    setErro("");
    setInfo("");
    try {
      const pub = await publicarNotaWiki(ativa.id, true);
      setConfirmPublish(false);
      setInfo(`Publicado no hardvault: ${pub.title}`);
      setHits(await buscarHardvault(busca));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao publicar.");
    }
  }

  async function pesquisar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    try {
      setHits(await buscarHardvault(busca));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha na busca.");
    }
  }

  function novaNota() {
    setAtiva(null);
    setTitulo("");
    setCorpo("");
    setConfirmPublish(false);
    setInfo("");
  }

  return (
    <section className="workspace-dm">
      <div className="detalhe-topo">
        <div>
          <button className="voltar" type="button" onClick={onVoltar}>
            Voltar
          </button>
          <h2>Wiki do escritório</h2>
          <p>
            Vault pessoal (deny-by-default) e hardvault publicado. Pack MCP só com snippets +
            SafeDTO.
          </p>
        </div>
      </div>

      {carregando && (
        <div className="vazio">
          <p>Carregando wiki…</p>
        </div>
      )}

      {!carregando && (
        <div className="workspace-dm-grade">
          <aside className="workspace-dm-lista" aria-label="Notas pessoais">
            <button type="button" className="dm-item" onClick={novaNota}>
              <strong>+ Nova nota</strong>
              <small>só você</small>
            </button>
            {notas.map((nota) => (
              <button
                key={nota.id}
                type="button"
                className={ativa?.id === nota.id ? "dm-item ativo" : "dm-item"}
                onClick={() => void abrirNota(nota.id)}
              >
                <strong>{nota.title}</strong>
                <small>pessoal</small>
              </button>
            ))}
            {!notas.length && (
              <p className="vazio-dica">Nenhuma nota pessoal ainda.</p>
            )}
          </aside>

          <div className="workspace-dm-thread">
            <form className="compositor" style={{ flexDirection: "column", alignItems: "stretch" }} onSubmit={salvarNova}>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título da nota pessoal"
              />
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                placeholder="Markdown / texto da nota (não entra no hardvault até publicar)"
                rows={10}
                style={{
                  width: "100%",
                  border: "1px solid var(--linha)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  background: "var(--papel)",
                  color: "var(--texto)",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button type="submit">Salvar no vault pessoal</button>
                {ativa ? (
                  <button
                    type="button"
                    className="voltar"
                    onClick={() => setConfirmPublish(true)}
                  >
                    Publicar no hardvault…
                  </button>
                ) : null}
              </div>
            </form>

            {confirmPublish && ativa ? (
              <article className="cartao-suave">
                <p className="olho">Confirmar publicação</p>
                <p>
                  A nota <strong>{ativa.title}</strong> vira documento do hardvault (snippet +
                  ACL do escritório). O vault pessoal continua seu.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => void publicar()}>
                    Confirmar publish
                  </button>
                  <button
                    type="button"
                    className="voltar"
                    onClick={() => setConfirmPublish(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </article>
            ) : null}

            <form className="compositor" onSubmit={pesquisar}>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar hardvault (só publicados)"
              />
              <button type="submit">Buscar</button>
            </form>

            <div className="chat-corpo">
              {hits.map((hit) => (
                <article key={hit.id} className="balao">
                  <header>
                    <strong>{hit.title}</strong>
                    <span>hardvault</span>
                  </header>
                  <p>{hit.snippet}</p>
                </article>
              ))}
              {!hits.length && (
                <div className="vazio">
                  <p>Hardvault sem hits (ou ainda sem publish).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {info && <p className="selo neutro">{info}</p>}
      {erro && (
        <p className="chat-erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}
