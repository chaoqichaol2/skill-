#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' Info.plist)"
release_name="TokenPulse-$version-macOS-universal"
dist_dir="$PWD/dist"
stage_dir="$(mktemp -d /tmp/tokenpulse-release.XXXXXX)"
mount_dir="$stage_dir/DMG"

cleanup() {
  /bin/rm -rf "$stage_dir"
}
trap cleanup EXIT

if [[ ! -x "TokenPulse.app/Contents/MacOS/AIUsageMonitor" ]]; then
  ./build.sh
fi

mkdir -p "$dist_dir" "$mount_dir"
ditto "TokenPulse.app" "$mount_dir/TokenPulse.app"
ditto "Distribution/安装说明.txt" "$mount_dir/安装说明.txt"
ditto "Distribution/README.txt" "$mount_dir/README.txt"
ln -s /Applications "$mount_dir/Applications"

hdiutil create \
  -volname "TokenPulse" \
  -srcfolder "$mount_dir" \
  -format UDZO \
  -ov \
  "$dist_dir/$release_name.dmg"

ditto -c -k --sequesterRsrc --keepParent \
  "TokenPulse.app" \
  "$dist_dir/$release_name.zip"

shasum -a 256 \
  "$dist_dir/$release_name.dmg" \
  "$dist_dir/$release_name.zip" \
  > "$dist_dir/$release_name-SHA256.txt"

echo "发布包已生成：$dist_dir"
