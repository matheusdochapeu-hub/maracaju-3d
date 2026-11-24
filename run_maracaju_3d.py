#!/usr/bin/env python3
"""
Servidor local do Maracaju 3D — abre o app no notebook e no celular (mesma Wi-Fi).

O app é 100% estático: nada de banco de dados nem upload. Este servidor só
serve a pasta `app/` e mostra o endereço da rede local para você abrir no
celular e caminhar pelo quintal.

Uso:
    python run_maracaju_3d.py
    # opcional: MARACAJU3D_PORT=9000 python run_maracaju_3d.py
"""

import http.server
import os
import socket
import socketserver
from pathlib import Path

PORT = int(os.environ.get("MARACAJU3D_PORT", "8088"))
ROOT_DIR = Path(__file__).resolve().parent
APP_DIR = ROOT_DIR / "app"


def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def end_headers(self):
        # Evita ficar preso em versões antigas do app durante o desenvolvimento.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, formato, *args):
        if "404" in (formato % args):
            super().log_message(formato, *args)


class Servidor(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def main():
    ip = get_lan_ip()
    print("=" * 68)
    print("  Maracaju 3D — Casa 88")
    print("=" * 68)
    print(f"  Notebook : http://127.0.0.1:{PORT}")
    print(f"  Celular  : http://{ip}:{PORT}   (mesma rede Wi-Fi)")
    print()
    print("  Dica: no celular, use o botão 'Usar meu GPS agora' no quintal.")
    print("  A câmera do navegador só abre em HTTPS ou localhost; no IP da")
    print("  rede o app cai no modo 'câmera nativa do celular'.")
    print("=" * 68)
    with Servidor(("0.0.0.0", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
