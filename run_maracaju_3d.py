#!/usr/bin/env python3
"""
Servidor Web Local — Maracaju 3D (Gêmeo Digital & Simulador Solar)
Zero dependências externas (usa apenas biblioteca padrão do Python 3).
Abre no notebook e libera acesso na rede Wi-Fi local para uso no celular!
"""

import http.server
import json
import os
import socket
import socketserver
import urllib.parse
from pathlib import Path

PORT = int(os.environ.get("MARACAJU3D_PORT", "8088"))
ROOT_DIR = Path(__file__).resolve().parent
APP_DIR = ROOT_DIR / "app"
CAPTURAS_DIR = ROOT_DIR / "capturas"
CENARIOS_DIR = ROOT_DIR / "cenarios"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def list_captures() -> dict:
    manifest_path = CAPTURAS_DIR / "geo_manifest.json"
    by_rel = {}
    if manifest_path.exists():
        try:
            raw = json.loads(manifest_path.read_text(encoding="utf-8"))
            for item in raw.get("photos", []):
                by_rel[item.get("rel_path", "")] = item
        except Exception:
            pass

    photos = []
    geotagged = 0
    if CAPTURAS_DIR.exists():
        for path in sorted(CAPTURAS_DIR.rglob("*")):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
                rel = path.relative_to(CAPTURAS_DIR).as_posix()
                meta = by_rel.get(rel, {})
                if meta.get("lat") is not None:
                    geotagged += 1
                photos.append(
                    {
                        "name": path.name,
                        "rel_path": rel,
                        "url": "/capturas/" + urllib.parse.quote(rel),
                        "lat": meta.get("lat"),
                        "lng": meta.get("lng"),
                        "compass": meta.get("compass"),
                        "dist_m": meta.get("dist_m"),
                        "date": meta.get("date"),
                    }
                )
    return {"photos": photos, "geotagged": geotagged}


class MaracajuHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/captures":
            payload = json.dumps(list_captures(), ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        if parsed.path == "/api/load-layout":
            target = CENARIOS_DIR / "layout_atual.json"
            if target.exists():
                data = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_error(404, "Nenhum cenário salvo ainda")
            return

        if parsed.path.startswith("/capturas/"):
            rel = urllib.parse.unquote(parsed.path[len("/capturas/"):]).lstrip("/")
            file_path = (CAPTURAS_DIR / rel).resolve()
            if CAPTURAS_DIR.resolve() in file_path.parents and file_path.is_file():
                ctype = self.guess_type(str(file_path))
                data = file_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            self.send_error(404, "Arquivo de captura não encontrado")
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/save-layout":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            try:
                obj = json.loads(body.decode("utf-8"))
                CENARIOS_DIR.mkdir(parents=True, exist_ok=True)
                (CENARIOS_DIR / "layout_atual.json").write_text(
                    json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8"
                )
                resp = json.dumps({"ok": True}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as exc:
                self.send_error(400, f"JSON inválido: {exc}")
            return
        self.send_error(404, "Endpoint não encontrado")


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def main():
    lan_ip = get_lan_ip()
    print("=" * 66)
    print("  Maracaju 3D — Gêmeo Digital & Simulador Solar (Casa Maracaju 88)")
    print("=" * 66)
    print(f"  Notebook : http://127.0.0.1:{PORT}")
    print(f"  Celular  : http://{lan_ip}:{PORT}  (mesma rede Wi-Fi)")
    print(f"  Capturas : {CAPTURAS_DIR}")
    print("  Pressione Ctrl+C para encerrar.")
    print("=" * 66)
    with ReusableTCPServer(("0.0.0.0", PORT), MaracajuHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
