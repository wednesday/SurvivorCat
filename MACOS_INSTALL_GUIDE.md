# macOS 安装指南

## 问题：应用提示"已损坏"或"无法打开"

这是macOS的安全机制（Gatekeeper）导致的，不是应用真的损坏了。

## 解决方案

### 方案1：用户侧解决（最简单）

让用户在终端运行以下命令：

```bash
# 进入应用所在目录
cd ~/Downloads  # 或应用实际所在目录

# 移除隔离属性
xattr -cr "Survivor Cat.app"

# 如果是dmg文件，先挂载dmg，然后
xattr -cr "/Volumes/Survivor Cat/Survivor Cat.app"
```

或者使用右键打开：

1. 在Finder中找到应用
2. 按住 **Control** 键点击应用图标
3. 选择 **打开**
4. 在弹出的对话框中点击 **打开**

### 方案2：开发者侧解决（需要Apple开发者账号）

#### 1. 注册Apple开发者账号

访问 https://developer.apple.com/ 注册（$99/年）

#### 2. 创建证书

```bash
# 查看可用的签名身份
security find-identity -v -p codesigning
```

#### 3. 配置Tauri签名

在 `src-tauri/tauri.conf.json` 中配置：

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "entitlements.plist"
    }
  }
}
```

#### 4. 创建 entitlements.plist

在 `src-tauri/` 目录创建 `entitlements.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

#### 5. 公证应用（Notarization）

构建后运行：

```bash
# 上传到Apple进行公证
xcrun notarytool submit "Survivor Cat.dmg" \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# 查看公证状态
xcrun notarytool log <submission-id> \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID"

# 装订公证票据
xcrun stapler staple "Survivor Cat.dmg"
```

### 方案3：临时解决（开发测试用）

如果只是分发给少数用户测试，可以提供说明文档告知用户执行：

```bash
sudo spctl --master-disable  # 临时关闭Gatekeeper（不推荐）
# 打开应用后再执行
sudo spctl --master-enable   # 重新启用Gatekeeper
```

## 自动化签名脚本

创建 `sign-app.sh`：

```bash
#!/bin/bash

APP_PATH="./src-tauri/target/release/bundle/macos/Survivor Cat.app"
IDENTITY="Developer ID Application: Your Name (TEAM_ID)"

echo "🔐 签名应用..."

# 签名应用
codesign --force --deep --sign "$IDENTITY" "$APP_PATH"

# 验证签名
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ 签名成功！"
else
    echo "❌ 签名失败！"
    exit 1
fi

# 创建DMG
echo "📦 创建DMG..."
hdiutil create -volname "Survivor Cat" \
    -srcfolder "$APP_PATH" \
    -ov -format UDZO \
    "Survivor Cat-signed.dmg"

echo "✅ 完成！DMG位置: ./Survivor Cat-signed.dmg"
```

## 推荐方案对比

| 方案 | 成本 | 难度 | 用户体验 |
|------|------|------|----------|
| 方案1（用户侧） | 免费 | 低 | 需要用户操作 |
| 方案2（代码签名） | $99/年 | 中 | 最佳 |
| 方案3（临时） | 免费 | 低 | 有安全风险 |

## 最佳实践

1. **个人学习/小范围分发**：使用方案1，在README中提供清晰的安装说明
2. **正式发布产品**：使用方案2，进行完整的签名和公证
3. **开发测试**：使用方案3，但不要分发给最终用户

## 常见问题

### Q: 为什么会有这个问题？
A: macOS从10.15开始强制要求应用签名和公证，以提高系统安全性。

### Q: Linux和Windows有这个问题吗？
A: Windows有类似的SmartScreen，但限制较宽松。Linux通常没有这个问题。

### Q: 不签名可以吗？
A: 可以，但需要用户手动允许。对于免费分发的应用，这是常见做法。

## 相关链接

- [Apple代码签名指南](https://developer.apple.com/support/code-signing/)
- [Tauri签名文档](https://tauri.app/distribute/sign/)
- [公证流程](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
