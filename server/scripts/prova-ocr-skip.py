"""Proof for ocr_skip.py. Run with server/.venv-chunk/bin/python."""
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
SCRIPT = AQUI / "ocr_skip.py"
FRASE = "O prazo para contestação é de quinze dias úteis."
FONTES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "Arial.ttf",
]


def fonte() -> ImageFont.FreeTypeFont:
    for caminho in FONTES:
        try:
            return ImageFont.truetype(caminho, 48)
        except OSError:
            continue
    raise SystemExit("Arial not found")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        registro = Path(tmp) / "registro.pdf"
        img = Image.new("RGB", (1700, 400), "white")
        ImageDraw.Draw(img).text((40, 150), FRASE, fill="black", font=fonte())
        img.save(registro, "PDF", resolution=150)
        antes = sha256(registro)

        r = subprocess.run([sys.executable, str(SCRIPT), str(registro)], capture_output=True, text=True)
        assert r.returncode == 0, f"ocr_skip exit {r.returncode}: {r.stderr[-2000:]}"
        assert sha256(registro) == antes, "record hash changed"
        pecas = json.loads(r.stdout)
        assert isinstance(pecas, list) and pecas, "no chunks"
        assert any("prazo" in p.lower() for p in pecas), f"no 'prazo' in chunks: {pecas}"

        fonte_script = SCRIPT.read_text().lower()
        assert "ghostscript" not in fonte_script, "script mentions ghostscript"
        assert not re.search(r"""["']gs["']|\bgs\s+-""", fonte_script), "script invokes gs"

        same = subprocess.run([sys.executable, str(SCRIPT), str(Path(tmp) / "nao-existe.pdf")], capture_output=True)
        assert same.returncode == 1, "missing input must exit 1"
        assert sha256(registro) == antes, "record hash changed after second call"

    assert not Path(tmp).exists(), "temp dir not deleted"
    print("prova-ocr-skip OK")


if __name__ == "__main__":
    main()
