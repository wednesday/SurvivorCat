# 存档系统更新说明

## 更新内容

将游戏存档系统从浏览器 localStorage 改为文件存储方式，解决重新打包后丢失存档的问题。

## 主要变更

### 1. 添加 Tauri 文件系统插件

- **前端依赖**: 添加 `@tauri-apps/plugin-fs`
- **后端依赖**: 在 `src-tauri/Cargo.toml` 添加 `tauri-plugin-fs = "2"`
- **权限配置**: 在 `src-tauri/capabilities/default.json` 添加文件系统权限
- **插件初始化**: 在 `src-tauri/src/lib.rs` 初始化 fs 插件

### 2. SaveManager 系统升级

- 所有方法改为异步 (async/await)
- 自动检测运行环境（Tauri 或浏览器）
- 在 Tauri 环境使用文件系统 API
- 在浏览器环境回退到 localStorage
- 存档文件位置：`AppData/survivor_cat_save.json`

### 3. 场景文件适配

所有调用 SaveManager 的场景文件已更新为异步调用：
- GameScene.ts
- MenuScene.ts
- SafeHouseScene.ts
- InventoryScene.ts
- EquipmentManager.ts

## 存档位置

### Windows
`%APPDATA%\com.phaser.game\survivor_cat_save.json`

### macOS
`~/Library/Application Support/com.phaser.game/survivor_cat_save.json`

### Linux
`~/.config/com.phaser.game/survivor_cat_save.json`

## 兼容性

- ✅ 支持 Tauri 桌面应用
- ✅ 支持浏览器开发环境（使用 localStorage 回退）
- ✅ 自动环境检测，无需手动配置
- ✅ 保留原有存档数据结构，无需迁移

## 测试建议

1. 在开发环境（浏览器）测试游戏功能
2. 构建 Tauri 应用并测试存档读写
3. 验证重新安装应用后存档是否保留
4. 测试存档的创建、读取、更新、删除操作

## 构建命令

```bash
# 开发测试
pnpm run tauri:dev

# 构建 Windows 版本
pnpm run tauri:build:win

# 构建 macOS 版本
pnpm run tauri:build:mac

# 构建 Linux 版本
pnpm run tauri:build:linux
```
