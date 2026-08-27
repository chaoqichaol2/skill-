#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export PATH="$ROOT/.platformio/packages/toolchain-gccarmnoneeabi/bin:$ROOT/.venv/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PICO_SDK_PATH="$ROOT/sdk-root/usr/src/pico-sdk"
export PICO_TOOLCHAIN_PATH="$ROOT/.platformio/packages/toolchain-gccarmnoneeabi"

"$ROOT/.venv/bin/cmake" -S "$ROOT/firmware" -B "$ROOT/build-release" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_MAKE_PROGRAM="$ROOT/.venv/bin/ninja" \
  -Dpicotool_DIR="$ROOT/picotool-native/picotool" \
  -DPICO_CLIB=newlib
"$ROOT/.venv/bin/cmake" --build "$ROOT/build-release" -j 6
