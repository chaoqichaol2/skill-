# RP2350 Codex 红绿灯

适配 `RP2350-Touch-LCD-3.49-EN` 的 USB Codex 状态灯，并带网易云音乐逐句歌词页。

## 状态

- 红灯：等待批准或用户输入
- 黄灯：Codex 正在工作
- 绿灯：本轮工作完成
- 全暗：空闲

三个灯都可直接触摸测试，底部按钮恢复空闲。USB 串口接受纯文本状态，也接受：

```json
{"v":1,"state":"working","source":"codex","count":1}
```

屏幕采用 640×172 横版布局。向左滑进入网易云桌面歌词条；需要 Codex 状态时向右滑回去。等待批准的红灯会自动切回 Codex 页。

## 手动测试

```sh
.venv/bin/python host/codex_light.py demo
.venv/bin/python host/codex_light.py waiting
.venv/bin/python host/codex_light.py working
.venv/bin/python host/codex_light.py done
.venv/bin/python host/codex_light.py idle
```

刷固件前免按 BOOTSEL：让开发板通过串口自己进入写入模式。

```sh
.venv/bin/python host/codex_light.py bootsel
```

屏幕白屏/雪花时远程自愈（LCD 硬复位 + 全屏重绘，不用拔线）：

```sh
.venv/bin/python host/codex_light.py lcdreset
```

Codex 自动联动配置位于 `.codex/hooks.json`。首次使用需在 Codex 的 `/hooks` 页面检查并信任这组本地脚本。

## 网易云歌词

先打开网易云音乐并播放一首歌，再运行：

```sh
.venv/bin/python host/codex_light.py netease
```

歌词桥读取 macOS 的当前歌曲和播放进度，用网易云本机历史记录匹配歌曲 ID，再获取对应的同步歌词。它不会读取网易云密码。停止时按 `Control-C`。

单独测试歌词页：

```sh
.venv/bin/python host/codex_light.py lyrics --title "测试歌曲" --artist "测试歌手" --line "这是一条滚动歌词"
```

固件输出：`build-release/codex_traffic_light.uf2`。

## 编译

```sh
./build_firmware.sh
```

硬件底层来自 Waveshare 官方 LVGL 示例；界面、USB 状态协议和 Codex 桥接为本项目代码。
