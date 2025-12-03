# 分发检查清单

## 构建前检查

- [ ] 更新版本号（package.json 和 tauri.conf.json）
- [ ] 测试所有功能正常
- [ ] 更新 CHANGELOG（如果有）
- [ ] 提交所有代码到 git

## 构建

```bash
./build-release.sh
```

## 发布检查

- [ ] 检查 `release-package` 文件夹内容
- [ ] 确认 DMG/安装包正常生成
- [ ] 确认 INSTALL.md 文件已包含

## 分发

### 选项1：GitHub Release（推荐）

```bash
# 创建tag
git tag v1.0.0
git push origin v1.0.0

# 在GitHub上创建Release
# 上传 release-package 文件夹中的文件
```

### 选项2：直接分享

1. 压缩 `release-package` 文件夹
2. 上传到网盘或文件分享服务
3. 分享链接时附带安装说明

## 给用户的提示信息模板

```
🎮 Survivor Cat 游戏下载

下载后请查看"安装说明.md"文件。

⚠️ macOS用户重要提示：
首次打开如果提示"应用已损坏"，请在终端运行：
cd ~/Downloads
xattr -cr "Survivor Cat.app"

然后就可以正常打开了！

这是macOS的安全机制，不是应用真的损坏。
详细说明请看压缩包内的"安装说明.md"。

祝游戏愉快！
```

## 常见用户问题准备

### macOS

**Q: 提示"应用已损坏"**
A: 这是正常的安全提示。在终端运行 `xattr -cr "Survivor Cat.app"` 即可。详见安装说明。

**Q: 没有开发者签名**
A: 这是个人免费项目，没有购买Apple开发者证书（$99/年）。应用是安全的，可以通过安装说明中的方法打开。

### Windows

**Q: SmartScreen警告**
A: 点击"更多信息" > "仍要运行"。这是因为没有购买代码签名证书。

### 通用

**Q: 游戏安全吗？**
A: 完全安全。源代码是公开的，可以查看。警告只是因为没有购买商业签名证书。

**Q: 为什么不签名？**
A: 代码签名证书每年需要付费（Apple $99，Windows $200+），对于免费游戏来说成本较高。

## 改进建议

如果项目有收入或用户量大，考虑：

1. 购买Apple开发者账号进行签名和公证
2. 购买Windows代码签名证书
3. 使用Electron Builder的自动更新功能
4. 建立官方网站提供下载

## 备注

- 首次分发建议先给少数用户测试
- 收集反馈后再大规模分发
- 在README中添加GitHub Stars提示，增加项目可信度
