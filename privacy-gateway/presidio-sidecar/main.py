"""Analyze API with explicit engine field. No silent upgrade of protection.

Returns engine=presidio only when Presidio actually ran.
Returns engine=regex_fallback when falling back (never pretend it is Presidio).
"""

from __future__ import annotations

import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any


def analyze_text(text: str) -> dict[str, Any]:
    prefer = os.environ.get("USE_PRESIDIO") == "1"
    if prefer:
        try:
            from presidio_analyzer import AnalyzerEngine

            analyzer = AnalyzerEngine()
            results = analyzer.analyze(text=text, language="en")
            return {
                "engine": "presidio",
                "spans": [
                    {
                        "start": r.start,
                        "end": r.end,
                        "entity_type": r.entity_type,
                    }
                    for r in results
                ],
            }
        except Exception as exc:
            return {
                "engine": "regex_fallback",
                "fallback_reason": f"presidio_error:{type(exc).__name__}",
                "spans": _regex_spans(text),
            }

    return {
        "engine": "regex_fallback",
        "fallback_reason": "presidio_not_enabled",
        "spans": _regex_spans(text),
    }


def _regex_spans(text: str) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    for match in re.finditer(
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b", text
    ):
        spans.append(
            {
                "start": match.start(),
                "end": match.end(),
                "entity_type": "PERSON",
            }
        )
    return spans


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/healthz"):
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/analyze":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("content-length", "0"))
        body = json.loads(self.rfile.read(length) or b"{}")
        text = body.get("text") or ""
        result = analyze_text(text)
        if "engine" not in result:
            self.send_response(500)
            self.end_headers()
            return
        payload = json.dumps(result).encode("utf-8")
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    port = int(os.environ.get("PORT", "8091"))
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"presidio-sidecar listening on {port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
