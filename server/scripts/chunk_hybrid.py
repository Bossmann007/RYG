"""Split a document read from stdin with Docling HybridChunker.

Prints a JSON array of chunk strings to stdout and nothing else. Exits 1 on
empty input, on any chunk over 512 tokens, or on any failure. HybridChunker has
no overlap argument, so there is none here.
"""
import contextlib
import json
import sys

MAX_TOKENS = 512
TOKENIZER = "unsloth/embeddinggemma-300m"


def chunk(texto: str) -> list[str]:
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
    doc = converter.convert_string(texto, format=InputFormat.MD, name="doc").document
    pecas = [chunker.contextualize(c) for c in chunker.chunk(doc)]
    if not pecas or any(not p.strip() or tok.count_tokens(p) > MAX_TOKENS for p in pecas):
        raise SystemExit(1)
    return pecas


def main() -> None:
    texto = sys.stdin.read()
    if not texto.strip():
        raise SystemExit(1)
    try:
        # Docling and HF write progress to stdout; keep stdout for the JSON only.
        with contextlib.redirect_stdout(sys.stderr):
            pecas = chunk(texto)
    except SystemExit:
        raise
    except Exception:
        raise SystemExit(1)
    sys.stdout.write(json.dumps(pecas, ensure_ascii=False))


if __name__ == "__main__":
    main()
