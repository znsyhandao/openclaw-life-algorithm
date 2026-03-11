# 🧠 life-memory - OpenClaw 记忆主权插件

> 基于 ContextEngine 官方接口，让你的 AI 真正记住你

## ✨ 特性

- ✅ **透明存储**：所有记忆以 Markdown 格式保存在 `~/clawd/memory/[agentId]/`
- ✅ **自动沉淀**：每轮对话后自动提取重要信息
- ✅ **版本控制**：天然支持 Git 管理记忆文件
- ✅ **冲突检测**：发现记忆矛盾时记录到 `CONFLICTS.md`
- ✅ **slash命令**：支持 `/remember` 和 `/recall`

## 📦 安装

```bash
# 通过 npm 安装
npm install -g openclaw-plugin-life-memory

# 或通过 OpenClaw 扩展市场（即将上线）
openclaw extensions install life-memory
```
