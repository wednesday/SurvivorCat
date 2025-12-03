#!/bin/bash

echo "🚀 启动 Tauri 开发环境..."
echo ""
echo "确保已安装:"
echo "  ✓ Node.js"
echo "  ✓ Rust (运行: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)"
echo "  ✓ Xcode Command Line Tools (运行: xcode-select --install)"
echo ""
echo "正在启动..."
echo ""

npm run tauri:dev
