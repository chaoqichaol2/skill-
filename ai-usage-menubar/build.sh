#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

app_name="TokenPulse.app"
legacy_app_name="AI 额度台.app"
executable_name="AIUsageMonitor"
contents="$app_name/Contents"
sdk_path="$(xcrun --sdk macosx --show-sdk-path)"
module_cache="$PWD/.build/ModuleCache"
arm_binary="$PWD/.build/$executable_name-arm64"
intel_binary="$PWD/.build/$executable_name-x86_64"

mkdir -p "$contents/MacOS" "$contents/Resources" "$module_cache"
if [[ -d "$legacy_app_name" ]]; then
  mv "$legacy_app_name" "$legacy_app_name.旧版"
fi

common_flags=(
  -O -parse-as-library
  -sdk "$sdk_path"
  -module-cache-path "$module_cache"
  -framework AppKit
  -framework Security
  -framework SwiftUI
  -framework UserNotifications
)

swiftc "${common_flags[@]}" \
  -target arm64-apple-macosx14.0 \
  Sources/*.swift \
  -o "$arm_binary"

swiftc "${common_flags[@]}" \
  -target x86_64-apple-macosx14.0 \
  Sources/*.swift \
  -o "$intel_binary"

lipo -create "$arm_binary" "$intel_binary" -output "$contents/MacOS/$executable_name"

cp Info.plist "$contents/Info.plist"
cp Assets/AppIcon.icns "$contents/Resources/AppIcon.icns"
codesign --force --sign - "$app_name"

echo "构建完成：$PWD/$app_name"
