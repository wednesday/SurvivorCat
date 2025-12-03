#!/bin/bash

echo "📦 构建 Survivor Cat 游戏..."
echo ""

# 构建应用
npm run tauri:build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败！"
    exit 1
fi

echo ""
echo "✅ 构建成功！"
echo ""

# 查找生成的文件
DMG_PATH="./src-tauri/target/release/bundle/dmg/Survivor Cat_1.0.0_aarch64.dmg"
APP_PATH="./src-tauri/target/release/bundle/macos/Survivor Cat.app"

if [ -f "$DMG_PATH" ]; then
    echo "📦 DMG 文件位置:"
    echo "   $DMG_PATH"
    echo ""
fi

if [ -d "$APP_PATH" ]; then
    echo "📱 APP 文件位置:"
    echo "   $APP_PATH"
    echo ""
fi

# 创建发布包
RELEASE_DIR="./release-package"
mkdir -p "$RELEASE_DIR"

echo "📋 创建发布包..."

# 复制文件
if [ -f "$DMG_PATH" ]; then
    cp "$DMG_PATH" "$RELEASE_DIR/"
fi

# 创建安装说明
cp INSTALL.md "$RELEASE_DIR/安装说明.md"

# 创建README
cat > "$RELEASE_DIR/README.txt" << 'EOF'
Survivor Cat - 游戏安装包

文件说明：
- Survivor Cat_1.0.0_aarch64.dmg - macOS安装文件（Apple Silicon）
- 安装说明.md - 详细的安装指南

⚠️ 重要提示（macOS用户）：

首次打开可能会提示"应用已损坏"，这是正常的安全提示。

解决方法：
1. 打开终端（应用程序 > 实用工具 > 终端）
2. 运行命令：
   cd ~/Downloads
   xattr -cr "Survivor Cat.app"

或者：
1. 按住Control键点击应用图标
2. 选择"打开"
3. 再次点击"打开"确认

详细说明请查看"安装说明.md"

祝你玩得开心！
EOF

echo "✅ 发布包已创建: $RELEASE_DIR"
echo ""
echo "📤 分发步骤："
echo "1. 将 $RELEASE_DIR 文件夹压缩"
echo "2. 分发给用户"
echo "3. 提醒用户查看'安装说明.md'"
echo ""
echo "💡 提示："
echo "- 如果有Apple开发者账号，可以对应用进行签名"
echo "- 查看 MACOS_INSTALL_GUIDE.md 了解签名方法"
