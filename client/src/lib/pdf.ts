const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 52;
const LINE = 14;
const WIDTH = PAGE_W - MARGIN_X * 2;

type FontId = "F1" | "F2";

type DrawOp =
  | { tipo: "color"; r: number; g: number; b: number }
  | { tipo: "rule"; y: number; width?: number }
  | { tipo: "text"; font: FontId; size: number; x: number; y: number; value: string };

const WINANSI: Record<string, number> = {
  Á: 193,
  À: 192,
  Â: 194,
  Ã: 195,
  Ä: 196,
  É: 201,
  Ê: 202,
  Í: 205,
  Ó: 211,
  Ô: 212,
  Õ: 213,
  Ú: 218,
  Ü: 220,
  Ç: 199,
  á: 225,
  à: 224,
  â: 226,
  ã: 227,
  ä: 228,
  é: 233,
  ê: 234,
  í: 237,
  ó: 243,
  ô: 244,
  õ: 245,
  ú: 250,
  ü: 252,
  ç: 231,
  "º": 186,
  "ª": 170,
  "·": 183,
  "–": 150,
  "—": 151,
  "“": 147,
  "”": 148,
  "‘": 145,
  "’": 146,
  "•": 149,
};

function pdfString(texto: string): string {
  let saida = "";
  for (const char of texto) {
    if (char === "\\" || char === "(" || char === ")") {
      saida += `\\${char}`;
      continue;
    }

    const code = char.charCodeAt(0);
    if (code === 0x0a || code === 0x0d) {
      continue;
    }

    if (code < 128) {
      saida += char;
      continue;
    }

    const mapped = WINANSI[char];
    saida += mapped != null ? `\\${mapped.toString(8).padStart(3, "0")}` : "?";
  }

  return saida;
}

function wrap(texto: string, size: number, max = WIDTH): string[] {
  const palavras = texto.replace(/\s+/g, " ").trim().split(" ");
  if (!palavras[0]) {
    return [];
  }

  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length * (size * 0.5) > max && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }

  if (atual) {
    linhas.push(atual);
  }

  return linhas;
}

export type RelatorioPdf = {
  titulo: string;
  subtitulo: string;
  meta: string[];
  aviso: string;
  blocos: { olho?: string; titulo?: string; linhas: string[] }[];
  rodape: string;
};

export function baixarPdf(nomeArquivo: string, relatorio: RelatorioPdf): void {
  const bytes = montarPdf(relatorio);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function montarPdf(relatorio: RelatorioPdf): Uint8Array {
  const paginasOps: DrawOp[][] = [];
  let ops: DrawOp[] = [];
  let y = PAGE_H - MARGIN_TOP;

  const novaPagina = () => {
    if (ops.length) {
      paginasOps.push(ops);
    }
    ops = [];
    y = PAGE_H - MARGIN_TOP;
    cabecalho();
  };

  const garantir = (altura: number) => {
    if (y - altura < MARGIN_BOTTOM + 24) {
      novaPagina();
    }
  };

  const cabecalho = () => {
    ops.push({ tipo: "color", r: 0.039, g: 0.102, b: 0.196 });
    ops.push({ tipo: "text", font: "F2", size: 11, x: MARGIN_X, y, value: "ZHEGGA ADVOGADOS ASSOCIADOS" });
    ops.push({
      tipo: "text",
      font: "F1",
      size: 9,
      x: PAGE_W - MARGIN_X - 128,
      y,
      value: "OpenLegalAI  ·  uso interno",
    });
    y -= 10;
    ops.push({ tipo: "rule", y });
    y -= 22;
    ops.push({ tipo: "text", font: "F2", size: 16, x: MARGIN_X, y, value: relatorio.titulo });
    y -= 16;
    ops.push({ tipo: "color", r: 0.29, g: 0.376, b: 0.471 });
    for (const linha of wrap(relatorio.subtitulo, 10)) {
      ops.push({ tipo: "text", font: "F1", size: 10, x: MARGIN_X, y, value: linha });
      y -= 13;
    }
    for (const meta of relatorio.meta) {
      ops.push({ tipo: "text", font: "F1", size: 9, x: MARGIN_X, y, value: meta });
      y -= 12;
    }
    y -= 4;
    ops.push({ tipo: "color", r: 0.102, g: 0.29, b: 0.478 });
    for (const linha of wrap(relatorio.aviso, 8)) {
      ops.push({ tipo: "text", font: "F1", size: 8, x: MARGIN_X, y, value: linha });
      y -= 11;
    }
    y -= 8;
    ops.push({ tipo: "rule", y });
    y -= 20;
  };

  cabecalho();

  for (const bloco of relatorio.blocos) {
    garantir(36);
    if (bloco.olho) {
      ops.push({ tipo: "color", r: 0.102, g: 0.29, b: 0.478 });
      ops.push({
        tipo: "text",
        font: "F2",
        size: 8,
        x: MARGIN_X,
        y,
        value: bloco.olho.toUpperCase(),
      });
      y -= 14;
    }

    if (bloco.titulo) {
      ops.push({ tipo: "color", r: 0.063, g: 0.125, b: 0.216 });
      ops.push({ tipo: "text", font: "F2", size: 12, x: MARGIN_X, y, value: bloco.titulo });
      y -= 16;
    }

    ops.push({ tipo: "color", r: 0.063, g: 0.125, b: 0.216 });
    for (const linha of bloco.linhas) {
      const pedacos = wrap(linha, 10);
      if (!pedacos.length) {
        y -= 8;
        continue;
      }

      for (const pedaco of pedacos) {
        garantir(LINE);
        ops.push({ tipo: "text", font: "F1", size: 10, x: MARGIN_X, y, value: pedaco });
        y -= LINE;
      }
      y -= 4;
    }
    y -= 8;
  }

  paginasOps.push(ops);
  return serializar(paginasOps, relatorio.rodape);
}

function streamDaPagina(
  ops: DrawOp[],
  pagina: number,
  total: number,
  rodape: string
): string {
  const cmds: string[] = ["q"];

  for (const op of ops) {
    if (op.tipo === "color") {
      cmds.push(`${op.r.toFixed(3)} ${op.g.toFixed(3)} ${op.b.toFixed(3)} rg`);
      cmds.push(`${op.r.toFixed(3)} ${op.g.toFixed(3)} ${op.b.toFixed(3)} RG`);
    } else if (op.tipo === "rule") {
      cmds.push("0.102 0.290 0.478 RG");
      cmds.push("0.7 w");
      cmds.push(`${MARGIN_X.toFixed(2)} ${op.y.toFixed(2)} m`);
      cmds.push(`${(MARGIN_X + (op.width ?? WIDTH)).toFixed(2)} ${op.y.toFixed(2)} l S`);
    } else {
      cmds.push(`BT /${op.font} ${op.size} Tf ${op.x.toFixed(2)} ${op.y.toFixed(2)} Td (${pdfString(op.value)}) Tj ET`);
    }
  }

  cmds.push("0.290 0.376 0.471 rg");
  cmds.push(
    `BT /F1 8 Tf ${MARGIN_X.toFixed(2)} 32 Td (${pdfString(`${rodape}  ·  pagina ${pagina} de ${total}`)}) Tj ET`
  );
  cmds.push("Q");
  return cmds.join("\n");
}

function encoder(texto: string): Uint8Array {
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i += 1) {
    bytes[i] = texto.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function serializar(paginasOps: DrawOp[][], rodape: string): Uint8Array {
  const parts: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  let size = encoder(parts[0]).length;

  const pushObj = (index: number, body: string) => {
    const bloco = `${index} 0 obj\n${body}\nendobj\n`;
    offsets[index] = size;
    parts.push(bloco);
    size += encoder(bloco).length;
  };

  const fontF1 =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  const fontF2 =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  const pageCount = paginasOps.length;
  const font1 = 3 + pageCount * 2;
  const font2 = font1 + 1;

  pushObj(1, "<< /Type /Catalog /Pages 2 0 R >>");

  const kids = paginasOps.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  pushObj(2, `<< /Type /Pages /Count ${pageCount} /Kids [${kids}] >>`);

  paginasOps.forEach((ops, i) => {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    const stream = streamDaPagina(ops, i + 1, pageCount, rodape);
    const streamBytes = encoder(stream);

    pushObj(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pushObj(contentId, `<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
  });

  pushObj(font1, fontF1);
  pushObj(font2, fontF2);

  const xrefPos = size;
  let xref = `xref\n0 ${font2 + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= font2; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${font2 + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  parts.push(xref, trailer);

  const texto = parts.join("");
  return encoder(texto);
}
