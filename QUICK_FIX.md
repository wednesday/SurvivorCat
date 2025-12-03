# 快速解决"应用已损坏"问题

## macOS 用户看这里 👇

### 问题
打开应用时提示："Survivor Cat已损坏，无法打开"

### 原因
这不是应用真的损坏了！这是 macOS 的安全保护（Gatekeeper）。
因为这是免费游戏，没有购买 Apple 的开发者证书（$99/年）进行签名。

### 解决方法（2步搞定）

#### 方法1：终端命令（推荐，30秒解决）

1. **打开终端**
   - 按 `Command + 空格`
   - 输入 "终端" 或 "Terminal"
   - 按回车

2. **复制粘贴以下命令，按回车**

```bash
cd ~/Downloads && xattr -cr "Survivor Cat.app"
```

3. **完成！** 现在可以正常打开游戏了

---

#### 方法2：右键打开

1. 在 Finder 中找到 "Survivor Cat.app"
2. **按住 Control 键** + 点击应用图标
3. 选择 "打开"
4. 在弹出的对话框中点击 "打开"

---

### 仍然有问题？

试试这个：

```bash
# 如果应用在"应用程序"文件夹
cd /Applications && sudo xattr -cr "Survivor Cat.app"

# 如果应用在其他位置，替换路径
sudo xattr -cr "/path/to/Survivor Cat.app"
```

## Windows 用户

如果提示 "Windows 保护了你的电脑"：

1. 点击 "更多信息"
2. 点击 "仍要运行"

## 为什么会这样？

- macOS/Windows 要求应用必须有开发者签名
- 开发者签名证书很贵（Apple $99/年，Windows $200+/年）
- 这是个人免费游戏项目，没有购买证书
- 应用本身完全安全，源代码是公开的

## 还是担心安全？

✅ 源代码完全公开，可以查看
✅ 使用 Tauri 框架，安全性高
✅ 没有网络请求，不收集任何数据
✅ 只是一个单机游戏

---

**祝你玩得开心！** 🎮

有问题？提交 Issue 或查看完整的 INSTALL.md
