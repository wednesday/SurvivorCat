# Phaser 吸血鬼幸存者类游戏

这是一个使用 Phaser 3 框架开发的类吸血鬼幸存者(Vampire Survivors-like)生存游戏。

## 📥 直接下载游戏

如果你只想玩游戏，**不需要下载代码**！

前往 [Releases](../../releases) 页面下载适合你系统的安装包。

### ⚠️ 重要：macOS 用户必读

首次打开可能提示"应用已损坏"，这是正常的安全提示。

**解决方法：** 在终端运行：
```bash
cd ~/Downloads
xattr -cr "Survivor Cat.app"
```

详细安装说明请查看下载包内的 `安装说明.md` 文件。

---

## 🚀 重要更新（开发者）

**项目已从 Electron 迁移到 Tauri！**

优势：
- ✅ 应用体积减小 90% (从 ~100MB 到 ~10MB)
- ✅ 内存占用更低
- ✅ 启动速度更快
- ✅ 更高的安全性

详见 [迁移指南](./MIGRATION_TO_TAURI.md) 和 [Tauri 构建文档](./TAURI_BUILD.md)

## 功能特性

- ✨ 使用 Phaser 3.80 专业游戏框架
- 🎮 自动射击机制
- 👾 无尽的敌人波次
- 📈 经验值和升级系统
- 💪 随机属性提升
- 🎯 自动瞄准最近敌人
- 📊 实时游戏统计显示
- 🗺️ 无限地图系统（动态加载/卸载）
- 🖥️ 使用 Tauri 打包为桌面应用

## 安装依赖

```bash
npm install
```

## 开发

### Web 开发模式

启动开发服务器：

```bash
npm run dev
```

项目将在 `http://localhost:5173` 启动。

### Tauri 开发模式

启动 Tauri 桌面应用开发：

```bash
npm run tauri:dev
# 或使用快捷脚本
./start-tauri.sh
```

## 构建

### Web 构建

构建生产版本：

```bash
npm run build
```

### Tauri 桌面应用构建

```bash
# 构建当前平台
npm run tauri:build

# macOS (Apple Silicon)
npm run tauri:build:mac

# Windows
npm run tauri:build:win

# Linux
npm run tauri:build:linux
```

详细构建说明请查看 [TAURI_BUILD.md](./TAURI_BUILD.md)

## 预览构建

预览生产构建：

```bash
npm run preview
```

## 项目结构

```
pixi/
├── src/
│   ├── main.ts              # Phaser 游戏入口
│   └── scenes/
│       └── GameScene.ts     # 主游戏场景
├── index.html               # HTML 入口
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
└── vite.config.js           # Vite 配置
```

## 游戏特色

- 🎯 **智能目标系统**: 自动瞄准并攻击最近的敌人
- 🧲 **经验吸引**: 经验球会被自动吸引到玩家身边
- 📈 **难度递增**: 随着等级提升，游戏难度逐渐增加
- 💥 **视觉反馈**: 丰富的打击感和升级特效
- 🎮 **流畅操作**: 响应灵敏的移动控制

## 游戏玩法

### 控制方式
- **WASD** 或 **方向键**: 移动角色
- 角色会自动攻击最近的敌人
- 收集经验球升级

### 游戏机制

1. **自动射击**: 角色会自动向最近的敌人发射抛射物
2. **敌人生成**: 敌人会从屏幕边缘不断生成并追逐玩家
3. **经验系统**: 击败敌人掉落经验球，收集经验升级
4. **升级奖励**: 每次升级随机获得以下提升之一：
   - 移动速度 +20
   - 攻击速度提升
   - 最大生命值 +20（并回满血）
   - 挑战难度提升（敌人生成更快）
5. **生存目标**: 尽可能长时间存活并击败更多敌人

### 游戏统计
- HP: 当前生命值
- Level: 当前等级
- EXP: 经验值进度
- Time: 存活时间
- Kills: 击杀数量

## 扩展建议

可以继续添加以下功能来丰富游戏：

1. **更多武器类型**: 
   - 环绕玩家的轨道武器
   - 范围攻击武器
   - 激光武器

2. **敌人变体**:
   - 不同血量和速度的敌人
   - Boss 敌人
   - 特殊能力的敌人

3. **升级选择**:
   - 升级时提供多个选项供玩家选择
   - 更多样化的属性提升

4. **道具系统**:
   - 临时增益道具
   - 治疗道具
   - 护盾道具

5. **视觉提升**:
   - 添加精灵图和动画
   - 粒子效果
   - 背景音乐和音效

## 技术栈

- **Phaser 3**: 专业的 HTML5 游戏框架
- **Arcade Physics**: 内置物理引擎
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速的开发构建工具

## 开发提示

- 游戏使用无重力的俯视角设计
- 摄像机跟随玩家移动
- 所有数值都可以在 GameScene 类中调整
- 使用 Phaser 的 Group 系统高效管理大量对象
