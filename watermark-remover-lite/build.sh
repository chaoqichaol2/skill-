#!/bin/zsh
set -e

cd "$(dirname "$0")"

app_name="轻量去水印.app"
executable_name="轻量去水印"
contents="$app_name/Contents"
sdk="/Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk"
module_cache="$PWD/.build/ModuleCache"

mkdir -p "$contents/MacOS" "$contents/Resources" "$module_cache"
swiftc -O -parse-as-library \
  -sdk "$sdk" \
  -target arm64-apple-macosx13.0 \
  -module-cache-path "$module_cache" \
  -framework AppKit \
  -framework ImageIO \
  -framework Vision \
  -framework UniformTypeIdentifiers \
  App.swift \
  -o "$contents/MacOS/$executable_name"
cp Info.plist "$contents/Info.plist"
codesign --force --sign - "$app_name"

echo "构建完成：$app_name"
du -sh "$app_name"
