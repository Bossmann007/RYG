"""OCR a PDF the caller already holds, then chunk it with Docling HybridChunker.

Usage: ocr_skip.py <path-to-pdf>

The input file is the record. It is only ever opened for reading. A copy is made
in a temp dir, OCRmyPDF runs on the copy, and the derived PDF goes through
Docling with its own OCR off. Prints a JSON array of contextualized chunks to
stdout and nothing else. Exits 1 on a changed record hash, an OCRmyPDF failure,
an empty result, a chunk over 512 tokens, or any other failure. HybridChunker has
no overlap argument, so there is none here.

`--optimize 0` keeps the PDF optimizer's external renderer out of the run and
`--output-type pdf` skips PDF/A, so the derived file is not PDF/A.
"""
import contextlib
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_TOKENS = 512
TOKENIZER = "unsloth/embeddinggemma-300m"
OCRMYPDF = Path(sys.executable).parent / "ocrmypdf"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def ocr_copy(copia: Path, derivado: Path) -> None:
    cmd = [
        str(OCRMYPDF), "--mode", "skip", "-l", "por+eng",
        "--optimize", "0", "--output-type", "pdf", str(copia), str(derivado),
    ]
    # Child stdout goes to stderr so ours carries only the JSON.
    if subprocess.run(cmd, stdout=sys.stderr).returncode != 0:
        raise SystemExit(1)


def chunk_pdf(pdf: Path) -> list[str]:
    from docling.chunking import HybridChunker
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer

    opts = PdfPipelineOptions()
    opts.do_ocr = False
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=opts)}
    )
    tok = HuggingFaceTokenizer.from_pretrained(model_name=TOKENIZER, max_tokens=MAX_TOKENS)
    nome = getattr(tok.tokenizer, "name_or_path", "")
    if "embeddinggemma" not in nome.lower() or "minilm" in nome.lower() or len(tok.tokenizer) <= 100000:
        raise SystemExit(1)
    chunker = HybridChunker(tokenizer=tok)
    doc = converter.convert(pdf).document
    pecas = [chunker.contextualize(c) for c in chunker.chunk(doc)]
    if not pecas or any(not p.strip() or tok.count_tokens(p) > MAX_TOKENS for p in pecas):
        raise SystemExit(1)
    return pecas


def run(registro: Path) -> list[str]:
    antes = sha256(registro)
    with tempfile.TemporaryDirectory() as tmp:
        copia = Path(tmp) / "copia.pdf"
        derivado = Path(tmp) / "derivado.pdf"
        if copia.resolve() == registro.resolve():
            raise SystemExit(1)
        shutil.copyfile(registro, copia)
        ocr_copy(copia, derivado)
        with contextlib.redirect_stdout(sys.stderr):
            pecas = chunk_pdf(derivado)
    if sha256(registro) != antes:
        raise SystemExit(1)
    return pecas


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(1)
    registro = Path(sys.argv[1])
    if not registro.is_file():
        raise SystemExit(1)
    try:
        pecas = run(registro)
    except SystemExit:
        raise
    except Exception:
        raise SystemExit(1)
    sys.stdout.write(json.dumps(pecas, ensure_ascii=False))


if __name__ == "__main__":
    main()
