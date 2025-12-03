# Tauri 打包指南

## 前置要求

### 1. 安装 Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. 安装系统依赖

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Windows:**
安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

## 开发模式

启动开发服务器：
```bash
npm run tauri:dev
```

这会同时启动 Vite 开发服务器和 Tauri 应用。

## 生产构建

### 构建所有平台
```bash
npm run tauri:build
```

### 针对特定平台构建

**macOS (Apple Silicon):**
```bash
npm run tauri:build:mac
```

**Windows:**
```bash
npm run tauri:build:win
```

**Linux:**
```bash
npm run tauri:build:linux
```

## 构建输出

构建完成后，打包文件位于：
- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/nsis/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

## 配置说明

### tauri.conf.json
主要配置文件，包含：
- 应用名称、版本、标识符
- 窗口大小和属性
- 打包设置
- 图标路径

### Cargo.toml
Rust 依赖配置文件。

## 图标要求

需要提供以下图标文件到 `src-tauri/icons/` 目录：
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

可以使用在线工具生成：https://tauri.app/start/create-project/#icons

## 优势对比 Electron

1. **体积更小**: 约 3-10MB vs Electron 的 50-100MB
2. **性能更好**: 使用系统原生 WebView
3. **资源占用低**: 内存和 CPU 占用更少
4. **更安全**: Rust 的内存安全保证
5. **跨平台**: 一次编写，多平台打包

## 故障排除

### 开发模式无法启动
确保 Vite 端口 5173 未被占用，或修改 `tauri.conf.json` 中的 `devUrl`。

### 构建失败
1. 确认 Rust 版本 >= 1.77.2
2. 运行 `cargo clean` 清理缓存
3. 检查系统依赖是否完整安装

### macOS 签名问题
首次运行可能需要在"系统偏好设置 > 安全性与隐私"中允许应用运行。

## 更多资源

- [Tauri 官方文档](https://tauri.app/)
- [Tauri API 文档](https://tauri.app/develop/api-js/)
- [Tauri 示例](https://github.com/tauri-apps/tauri/tree/dev/examples)
