# Windows 多架构打包指南

## 支持的架构

Tauri 支持打包以下 Windows 架构：

1. **x86_64 (64位)** - 现代Windows系统（推荐）
2. **i686 (32位)** - 老旧Windows系统
3. **aarch64 (ARM64)** - Windows on ARM设备

## 快速打包

### 打包 64位 Windows (推荐)

```bash
npm run tauri:build:win
```

输出位置：`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/`

### 打包 32位 Windows (兼容老系统)

```bash
npm run tauri:build:win32
```

输出位置：`src-tauri/target/i686-pc-windows-msvc/release/bundle/`

### 同时打包 32位 和 64位

```bash
npm run tauri:build:all-win
```

## 前置要求

### 1. 安装 Rust

```powershell
# PowerShell (管理员)
winget install --id Rustlang.Rust.MSVC
```

或从官网下载：https://rustup.rs/

### 2. 添加32位目标支持

如果要打包32位版本，需要先添加目标：

```bash
rustup target add i686-pc-windows-msvc
```

### 3. 安装 Windows 构建工具

需要安装 Microsoft C++ Build Tools：

- 下载：https://visualstudio.microsoft.com/visual-cpp-build-tools/
- 或安装 Visual Studio（选择"使用C++的桌面开发"工作负载）

## 打包输出

### 生成的文件

每个架构会生成以下文件：

```
src-tauri/target/[架构]/release/bundle/
├── nsis/
│   └── Survivor Cat_1.0.0_x64-setup.exe  (安装程序)
└── msi/
    └── Survivor Cat_1.0.0_x64_en-US.msi  (MSI安装包)
```

### 架构说明

| 架构 | 目标平台 | 适用系统 | 推荐 |
|------|----------|----------|------|
| x86_64 | 64位 | Windows 10/11 (64位) | ⭐ 推荐 |
| i686 | 32位 | Windows 7/8/10 (32位) | 老系统 |
| aarch64 | ARM64 | Surface Pro X 等 | 特殊设备 |

## 跨平台打包

### 在 macOS 上打包 Windows 应用

需要交叉编译工具链：

```bash
# 安装交叉编译工具
brew install mingw-w64

# 添加Windows目标
rustup target add x86_64-pc-windows-gnu
rustup target add i686-pc-windows-gnu

# 打包（使用GNU工具链）
cargo tauri build --target x86_64-pc-windows-gnu
```

**注意：** 跨平台编译可能遇到问题，建议在 Windows 上构建 Windows 应用。

### 在 Linux 上打包 Windows 应用

```bash
# Ubuntu/Debian
sudo apt install mingw-w64

# 添加目标
rustup target add x86_64-pc-windows-gnu

# 打包
cargo tauri build --target x86_64-pc-windows-gnu
```

## 优化建议

### 减小应用体积

在 `src-tauri/Cargo.toml` 中已配置：

```toml
[profile.release]
panic = "abort"      # 减小体积
codegen-units = 1    # 优化性能
lto = true           # 链接时优化
opt-level = "s"      # 优化体积
strip = true         # 移除调试符号
```

### 典型体积

- **64位版本：** ~8-12 MB
- **32位版本：** ~7-10 MB

## 常见问题

### Q: 需要同时提供32位和64位版本吗？

**A:** 看用户群：
- 如果目标用户是现代Windows用户，只需64位版本
- 如果要支持老旧系统（Windows 7 32位等），提供32位版本

### Q: 如何命名安装包？

建议命名方式：
- `Survivor-Cat-1.0.0-win64.exe` (64位)
- `Survivor-Cat-1.0.0-win32.exe` (32位)

### Q: 打包失败怎么办？

1. 确认已安装 Rust 和 MSVC 工具链
2. 运行 `rustup update` 更新 Rust
3. 清理缓存：`cargo clean`
4. 重新打包

### Q: 如何测试打包结果？

- 64位程序可以在64位Windows上运行
- 32位程序可以在32位和64位Windows上运行
- 建议在虚拟机中测试不同架构

## 自动化打包脚本

创建 `build-windows.bat`：

```batch
@echo off
echo Building Windows apps...

echo.
echo [1/3] Building 64-bit version...
call npm run tauri:build:win

echo.
echo [2/3] Building 32-bit version...
call npm run tauri:build:win32

echo.
echo [3/3] Creating release package...
mkdir release-windows
copy src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*.exe release-windows\Survivor-Cat-win64.exe
copy src-tauri\target\i686-pc-windows-msvc\release\bundle\nsis\*.exe release-windows\Survivor-Cat-win32.exe

echo.
echo Done! Files in release-windows folder.
pause
```

## 发布建议

### GitHub Release

```bash
# 创建tag
git tag v1.0.0
git push origin v1.0.0
```

上传以下文件：
- `Survivor-Cat-1.0.0-win64.exe` (64位安装程序)
- `Survivor-Cat-1.0.0-win32.exe` (32位安装程序)
- `README.txt` (说明文档)

### 下载说明模板

```
🎮 Survivor Cat 下载

选择适合你系统的版本：

✅ Survivor-Cat-1.0.0-win64.exe (推荐)
   适用于：Windows 10/11 (64位)
   
✅ Survivor-Cat-1.0.0-win32.exe
   适用于：Windows 7/8/10 (32位)
   老旧电脑或32位系统选这个

💡 提示：
- 大多数现代电脑应该选择64位版本
- 如果不确定，右键"此电脑" > "属性"查看系统类型
- 首次运行可能有SmartScreen警告，点击"更多信息">"仍要运行"
```

## 相关链接

- [Tauri 打包文档](https://tauri.app/distribute/building/)
- [Rust 目标平台](https://doc.rust-lang.org/nightly/rustc/platform-support.html)
- [Windows 安装程序](https://nsis.sourceforge.io/)
