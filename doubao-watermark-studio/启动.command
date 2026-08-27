#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [[ ! -x ".venv/bin/python" ]]; then
  python_cmd=""
  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      version="$($candidate -c 'import sys; print(sys.version_info.major * 100 + sys.version_info.minor)')"
      if [[ "$version" -ge 310 ]]; then
        python_cmd="$candidate"
        break
      fi
    fi
  done

  if [[ -z "$python_cmd" ]]; then
    echo "需要 Python 3.10 或更高版本。"
    echo "请先从 https://www.python.org/downloads/ 安装 Python，再重新双击本文件。"
    read "?按回车键关闭…"
    exit 1
  fi

  echo "首次运行，正在安装本地处理引擎（约 70 MB）…"
  "$python_cmd" -m venv .venv
  .venv/bin/python -m pip install -r requirements.txt
fi

echo "正在启动豆包水印清理室…"
exec .venv/bin/python server.py
