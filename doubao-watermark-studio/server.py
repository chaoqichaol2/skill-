#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import subprocess
import sys
import tempfile
import threading
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
MAX_UPLOAD = 50 * 1024 * 1024
ALLOWED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def engine_path() -> Path:
    # Keep the virtual-environment path. Resolving the python symlink would
    # jump back to the base runtime and miss the venv's console scripts.
    executable = Path(sys.executable).parent / "remove-ai-watermarks"
    if not executable.exists():
        raise RuntimeError("去水印引擎未安装，请重新双击“启动.command”完成安装。")
    return executable


def safe_suffix(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix in ALLOWED_SUFFIXES else ".png"


def parse_region(value: str, width: int, height: int) -> tuple[int, int, int, int]:
    try:
        x, y, w, h = (int(round(float(item))) for item in value.split(","))
    except (TypeError, ValueError):
        raise ValueError("手动框选区域无效，请重新拖动画框。") from None

    x = max(0, min(x, width - 1))
    y = max(0, min(y, height - 1))
    w = max(1, min(w, width - x))
    h = max(1, min(h, height - y))
    if w * h > width * height * 0.35:
        raise ValueError("框选区域过大。请只框住水印，避免改变主体画面。")
    return x, y, w, h


class AppHandler(BaseHTTPRequestHandler):
    server_version = "DoubaoWatermarkStudio/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            try:
                engine_path()
                self.send_json(HTTPStatus.OK, {"ok": True, "engine": "remove-ai-watermarks 0.26.1 / OpenCV"})
            except RuntimeError as exc:
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"ok": False, "error": str(exc)})
            return

        relative = "index.html" if path == "/" else path.lstrip("/")
        target = (WEB_ROOT / relative).resolve()
        if WEB_ROOT.resolve() not in target.parents or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        body = target.read_bytes()
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type == "application/javascript":
            content_type += "; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        if urllib.parse.urlparse(self.path).path != "/api/process":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > MAX_UPLOAD:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "图片为空或超过 50 MB。"})
            return

        filename = urllib.parse.unquote(self.headers.get("X-Filename", "image.png"))
        suffix = safe_suffix(filename)
        mode = self.headers.get("X-Mode", "doubao")
        raw = self.rfile.read(content_length)

        try:
            cli = engine_path()
            with tempfile.TemporaryDirectory(prefix="doubao-watermark-") as temp_dir:
                source = Path(temp_dir) / f"source{suffix}"
                output = Path(temp_dir) / f"result{suffix}"
                source.write_bytes(raw)

                with Image.open(source) as image:
                    width, height = image.size
                    image.verify()

                if mode == "doubao":
                    command = [
                        str(cli), "visible", str(source),
                        "--mark", "doubao", "--no-detect",
                        "--backend", "cv2", "--keep-metadata",
                        "-o", str(output),
                    ]
                    description = "豆包固定模板"
                elif mode == "region":
                    region = parse_region(self.headers.get("X-Region", ""), width, height)
                    command = [
                        str(cli), "erase", str(source),
                        "--region", ",".join(str(item) for item in region),
                        "--backend", "cv2", "--inpaint-method", "telea",
                        "--dilate", "3", "--keep-metadata",
                        "-o", str(output),
                    ]
                    description = f"手动区域 {region[0]},{region[1]},{region[2]},{region[3]}"
                else:
                    raise ValueError("未知处理模式。")

                completed = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    timeout=120,
                    check=False,
                    env={**os.environ, "PYTHONUNBUFFERED": "1"},
                )
                if completed.returncode != 0 or not output.exists():
                    detail = (completed.stderr or completed.stdout or "处理失败").strip().splitlines()[-1]
                    raise RuntimeError(detail)

                result = output.read_bytes()
                content_type = mimetypes.guess_type(output.name)[0] or "image/png"
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(result)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Process-Mode", urllib.parse.quote(description))
                self.end_headers()
                self.wfile.write(result)
        except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
            self.send_json(HTTPStatus.UNPROCESSABLE_ENTITY, {"ok": False, "error": str(exc)})


def main() -> None:
    parser = argparse.ArgumentParser(description="豆包水印清理室本地服务")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), AppHandler)
    address = f"http://{args.host}:{args.port}"
    print(f"豆包水印清理室已启动：{address}")
    print("关闭此窗口即可停止服务。")
    if not args.no_open:
        threading.Timer(0.8, lambda: webbrowser.open(address)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
