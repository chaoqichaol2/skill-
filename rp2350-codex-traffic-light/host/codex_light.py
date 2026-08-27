#!/usr/bin/env python3
"""USB bridge for the RP2350 Codex traffic light."""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import serial


STATE_FILE = Path("/tmp/codex-traffic-light-state.json")
STATE_PRIORITY = {"idle": 0, "done": 1, "working": 2, "waiting": 3}
NOW_PLAYING_SCRIPT = Path(__file__).with_name("now_playing.js")
NETEASE_DB = Path.home() / "Library/Application Support/com.netease.163music/Documents/storage/sqlite_storage.sqlite3"
NETEASE_CACHE = Path.home() / "Library/Application Support/com.netease.163music/Caches/online_play_cache"
LRC_TIMESTAMP = re.compile(r"\[(\d{1,3}):(\d{2}(?:\.\d+)?)\]")


def find_port(explicit: str | None = None) -> str:
    if explicit:
        return explicit
    ports = sorted(glob.glob("/dev/cu.usbmodem*"))
    if not ports:
        raise RuntimeError("没有找到开发板 USB 串口")
    return ports[0]


def send(payload: dict, port: str | None = None, read_reply: bool = True) -> str:
    device = find_port(port)
    message = (json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    with serial.Serial(device, 115200, timeout=0.35, write_timeout=0.35) as connection:
        time.sleep(0.08)
        connection.reset_input_buffer()
        connection.write(message)
        connection.flush()
        if not read_reply:
            return ""
        return connection.readline().decode("utf-8", errors="replace").strip()


def read_now_playing() -> dict:
    cli = shutil.which("nowplaying-cli")
    if cli:
        result = subprocess.run(
            [cli, "get", "--json", "title", "artist", "album", "duration",
             "elapsedTime", "playbackRate", "clientBundleIdentifier"],
            check=True,
            capture_output=True,
            text=True,
            timeout=3,
        )
        data = json.loads(result.stdout or "{}")
        return {
            "app": data.get("clientBundleIdentifier"),
            "title": data.get("title"),
            "artist": data.get("artist"),
            "album": data.get("album"),
            "duration": data.get("duration", 0),
            "elapsed": data.get("elapsedTime", 0),
            "rate": data.get("playbackRate", 0),
        }
    result = subprocess.run(
        ["/usr/bin/osascript", "-l", "JavaScript", str(NOW_PLAYING_SCRIPT)],
        check=True,
        capture_output=True,
        text=True,
        timeout=3,
    )
    return json.loads(result.stdout or "{}")


def normalize(value: str) -> str:
    return re.sub(r"[\s·・—_\-（）()\[\]]+", "", value or "").casefold()


def find_netease_song(title: str, artist: str) -> tuple[str, dict] | None:
    if not title or not NETEASE_DB.exists():
        return None
    with sqlite3.connect(f"file:{NETEASE_DB}?mode=ro", uri=True) as connection:
        # historyTracks only appears after a song has played for a while;
        # dbTrack caches every song the app has loaded (playlists etc.).
        rows = connection.execute(
            "SELECT id, jsonStr FROM historyTracks ORDER BY playtime DESC LIMIT 500"
        ).fetchall()
        rows += connection.execute("SELECT id, jsonStr FROM dbTrack").fetchall()
    wanted_title = normalize(title)
    wanted_artist = normalize(artist)
    title_match = None
    for song_id, raw in rows:
        try:
            song = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            continue
        if normalize(song.get("name", "")) != wanted_title:
            continue
        artists = " / ".join(entry.get("name", "") for entry in song.get("artists", []))
        candidate = (str(song_id), song)
        if not wanted_artist or wanted_artist in normalize(artists) or normalize(artists) in wanted_artist:
            return candidate
        title_match = candidate
    return title_match


def find_cached_netease_song(title: str, artist: str) -> tuple[str, dict] | None:
    if not NETEASE_CACHE.exists():
        return None
    files = sorted(NETEASE_CACHE.glob("*.info"), key=lambda path: path.stat().st_mtime, reverse=True)[:12]
    song_ids = [path.name.split("-_-_", 1)[0] for path in files]
    song_ids = [song_id for song_id in song_ids if song_id.isdigit()]
    if not song_ids:
        return None
    query = urllib.parse.urlencode({"ids": json.dumps([int(song_id) for song_id in song_ids])})
    request = urllib.request.Request(
        f"https://music.163.com/api/song/detail/?{query}",
        headers={"User-Agent": "Mozilla/5.0", "Referer": "https://music.163.com/"},
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        songs = json.load(response).get("songs", [])
    wanted_title = normalize(title)
    wanted_artist = normalize(artist)
    for song in songs:
        if normalize(song.get("name", "")) != wanted_title:
            continue
        artists = " / ".join(entry.get("name", "") for entry in song.get("artists", []))
        if not wanted_artist or wanted_artist in normalize(artists) or normalize(artists) in wanted_artist:
            return str(song.get("id")), song
    return None


def resolve_netease_song(title: str, artist: str) -> tuple[str, dict] | None:
    return find_netease_song(title, artist) or find_cached_netease_song(title, artist)


def parse_lrc(raw: str) -> list[tuple[float, str]]:
    lines: list[tuple[float, str]] = []
    for source_line in raw.splitlines():
        stamps = LRC_TIMESTAMP.findall(source_line)
        text = LRC_TIMESTAMP.sub("", source_line).strip()
        if not stamps or not text:
            continue
        for minutes, seconds in stamps:
            lines.append((int(minutes) * 60 + float(seconds), text))
    return sorted(lines)


def fetch_lyrics(song_id: str) -> list[tuple[float, str]]:
    url = f"https://music.163.com/api/song/lyric?id={song_id}&lv=1&kv=1&tv=-1"
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://music.163.com/",
        },
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        body = json.load(response)
    return parse_lrc(body.get("lrc", {}).get("lyric", ""))


def lyric_index(lines: list[tuple[float, str]], elapsed: float) -> int:
    current = -1
    for index, (timestamp, _) in enumerate(lines):
        if timestamp > elapsed + 0.12:
            break
        current = index
    return current


def lyric_payload(title: str, artist: str, lines: list[tuple[float, str]], index: int, show: bool) -> dict:
    def line(offset: int) -> str:
        position = index + offset
        return lines[position][1] if 0 <= position < len(lines) else ""

    current = line(0) if index >= 0 else "♪"
    return {
        "v": 1,
        "command": "lyrics",
        "title": title or "网易云音乐",
        "artist": artist or "正在播放",
        "previous": line(-1),
        "line": current,
        "next": line(1 if index >= 0 else 0),
        "show": show,
    }


def netease_monitor(port: str | None = None) -> None:
    cached_song_id = ""
    cached_lines: list[tuple[float, str]] = []
    cached_artist = ""
    last_key: tuple = ()
    first_update = True
    clock_title = ""
    clock_elapsed = 0.0
    clock_raw_elapsed = 0.0
    clock_updated = time.monotonic()
    resolved_title = ""
    resolve_attempt = 0.0
    print("网易云歌词桥已启动，按 Ctrl+C 停止。")
    while True:
        try:
            playing = read_now_playing()
            app = normalize(str(playing.get("app") or ""))
            title = str(playing.get("title") or "")
            artist = str(playing.get("artist") or "")
            raw_elapsed = float(playing.get("elapsed") or 0)
            now = time.monotonic()
            if title != clock_title:
                clock_title = title
                clock_elapsed = raw_elapsed
                clock_raw_elapsed = raw_elapsed
                clock_updated = now
                cached_song_id = ""
                cached_lines = []
                cached_artist = ""
                last_key = ()
            elif abs(raw_elapsed - clock_raw_elapsed) > 0.25:
                clock_elapsed = raw_elapsed
                clock_raw_elapsed = raw_elapsed
                clock_updated = now
            elapsed = clock_elapsed + max(0.0, now - clock_updated) * float(playing.get("rate") or 0)
            # Ignore other media players when macOS exposes the active app name.
            if title and (not app or "网易云" in app or "netease" in app or "163music" in app):
                match = None
                if title != resolved_title or (not cached_song_id and now - resolve_attempt >= 5):
                    match = resolve_netease_song(title, artist)
                    resolved_title = title
                    resolve_attempt = now
                if match and match[0] != cached_song_id:
                    cached_song_id, song = match
                    cached_lines = fetch_lyrics(cached_song_id)
                    cached_artist = artist or " / ".join(a.get("name", "") for a in song.get("artists", []))
                    last_key = ()
                index = lyric_index(cached_lines, elapsed)
                display_artist = artist or cached_artist
                key = (cached_song_id, index, title, display_artist)
                if cached_song_id and key != last_key:
                    reply = send(
                        lyric_payload(title, display_artist, cached_lines, index, first_update),
                        port,
                        read_reply=True,
                    )
                    if not reply.startswith("OK lyrics="):
                        raise RuntimeError(f"开发板未确认歌词：{reply or '无回复'}")
                    print(f"♪ {title} · {lyric_payload(title, display_artist, cached_lines, index, False)['line']}", flush=True)
                    last_key = key
                    first_update = False
        except (subprocess.SubprocessError, json.JSONDecodeError, sqlite3.Error,
                urllib.error.URLError, RuntimeError, serial.SerialException, OSError, ValueError):
            # Playback, network and USB are all allowed to disappear temporarily.
            pass
        time.sleep(0.35)


def load_states() -> dict:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def save_states(states: dict) -> None:
    temp = STATE_FILE.with_suffix(f".{os.getpid()}.tmp")
    temp.write_text(json.dumps(states), encoding="utf-8")
    temp.replace(STATE_FILE)


def aggregate(states: dict) -> tuple[str, int]:
    active = [entry["state"] for entry in states.values()]
    if not active:
        return "idle", 0
    return max(active, key=lambda value: STATE_PRIORITY.get(value, 0)), len(active)


def hook_state(event: dict) -> None:
    event_name = event.get("hook_event_name", "")
    session_id = event.get("session_id", "default")
    mapping = {
        "SessionStart": "working",
        "UserPromptSubmit": "working",
        "PreToolUse": "working",
        "PostToolUse": "working",
        "PermissionRequest": "waiting",
        "Stop": "done",
    }

    states = load_states()
    if event_name == "SessionEnd":
        states.pop(session_id, None)
    elif event_name in mapping:
        states[session_id] = {"state": mapping[event_name], "updated": time.time()}

    # Drop stale sessions so an abandoned task cannot leave the light stuck forever.
    cutoff = time.time() - 12 * 60 * 60
    states = {key: value for key, value in states.items() if value.get("updated", 0) >= cutoff}
    save_states(states)
    state, count = aggregate(states)
    try:
        send({"v": 1, "state": state, "source": "codex", "count": count}, read_reply=False)
    except (RuntimeError, serial.SerialException, OSError):
        # Hooks must never interrupt Codex just because the board is unplugged.
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Codex 红绿灯 USB 控制器")
    parser.add_argument(
        "command",
        choices=["idle", "working", "waiting", "done", "status", "demo", "hook",
                 "lyrics", "netease", "bootsel", "lcdreset"],
    )
    parser.add_argument("--port", help="手动指定 /dev/cu.usbmodem...")
    parser.add_argument("--title", default="网易云音乐")
    parser.add_argument("--artist", default="歌词测试")
    parser.add_argument("--line", default="这是一条滚动歌词")
    args = parser.parse_args()

    if args.command == "hook":
        try:
            event = json.load(sys.stdin)
        except json.JSONDecodeError:
            return 0
        hook_state(event)
        return 0

    if args.command == "netease":
        try:
            netease_monitor(args.port)
        except KeyboardInterrupt:
            print("\n网易云歌词桥已停止。")
        return 0

    if args.command == "lcdreset":
        try:
            reply = send({"v": 1, "command": "lcdreset", "source": "manual"}, args.port)
        except (RuntimeError, serial.SerialException, OSError) as error:
            print(f"连接失败：{error}", file=sys.stderr)
            return 1
        print(reply or "已发送，屏幕将硬复位并重绘")

    if args.command == "bootsel":
        try:
            reply = send({"v": 1, "command": "reboot", "source": "manual"}, args.port)
        except (RuntimeError, serial.SerialException, OSError) as error:
            print(f"连接失败：{error}", file=sys.stderr)
            return 1
        print(reply or "已发送，开发板将进入 BOOTSEL 模式")
        return 0

    if args.command == "lyrics":
        payload = {
            "v": 1,
            "command": "lyrics",
            "title": args.title,
            "artist": args.artist,
            "previous": "上一句歌词",
            "line": args.line,
            "next": "下一句歌词",
            "show": True,
        }
    else:
        payload = {"v": 1, "state": args.command, "source": "manual"}
        if args.command in {"status", "demo"}:
            payload = {"v": 1, "command": args.command, "source": "manual"}
    try:
        reply = send(payload, args.port)
    except (RuntimeError, serial.SerialException, OSError) as error:
        print(f"连接失败：{error}", file=sys.stderr)
        return 1
    print(reply or "已发送")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
