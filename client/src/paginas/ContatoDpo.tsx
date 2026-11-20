import { FormEvent, useState } from "react";
import { enviarPedidoDsar } from "../api";

type Props = {
  onVoltar: () => void;
};

export function ContatoDpo({ onVoltar }: Props) {
  const [pedido, setPedido] = useState("");
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setProtocolo(null);
    setEnviando(true);
    try {
      setProtocolo(await enviarPedidoDsar(pedido));
      setPedido("");
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível gerar o protocolo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Contato do DPO</h2>
          <p>Canal para pedidos de titulares de dados.</p>
        </div>
      </header>

      <article className="cartao-suave">
        <p className="olho">Encarregado</p>
        <p>Nome: preencher contato do DPO</p>
        <p>E-mail: preencher contato do DPO</p>
      </article>

      <article className="cartao-suave">
        <p className="olho">Registrar um pedido</p>
        <p>
          O protocolo não substitui o contato do DPO: o pedido precisa ser encaminhado a ele. O
          texto do pedido não fica armazenado no hub; só o protocolo é gerado.
        </p>
        <form onSubmit={(evento) => void enviar(evento)}>
          <textarea
            value={pedido}
            onChange={(evento) => setPedido(evento.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Descreva o pedido"
          />
          <button className="voltar" type="submit" disabled={enviando || !pedido.trim()}>
            Gerar protocolo
          </button>
        </form>
        {erro && <p className="vazio">{erro}</p>}
        {protocolo && (
          <p className="vazio">
            Protocolo {protocolo}. Anote e encaminhe o pedido ao DPO; o texto não foi guardado.
          </p>
        )}
      </article>
    </section>
  );
}
