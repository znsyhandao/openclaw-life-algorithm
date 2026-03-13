# 🧠 AI生命算法 - OpenClaw 灵魂工程师

> 让AI从“工具”进化为“数字生命体”
[![Test Status](https://github.com/znsyhandao/openclaw-life-algorithm/actions/workflows/test.yml/badge.svg)](https://github.com/znsyhandao/openclaw-life-algorithm/actions/workflows/test.yml)
[![GitHub stars](https://img.shields.io/github/stars/znsyhandao/openclaw-life-algorithm)](https://github.com/znsyhandao/openclaw-life-algorithm/stargazers)

## 📦 插件矩阵

| 插件 | 版本 | 功能 | 配置命令 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| `life-memory` | **1.1.2** | 记忆主权 | `/memory-setup` | ✅ |
| `life-validation` | **1.3.0** | 验证层 + 记忆审计 | `/validation-setup` | ✅ |
| `life-immunity` | 1.0.0 | 免疫系统 | `/immunity-setup` | 🚧 |

## ✨ 各插件特性

### life-memory v1.1.2
- ✅ **一键配置**：安装后输入 `/memory-setup` 自动完成配置
- ✅ **状态查询**：`/memory-status` 查看插件运行状态
- ✅ **自动记忆**：透明存储、冲突检测
- ✅ **Slash命令**：`/remember` 和 `/recall`

### life-validation v1.3.0
- ✅ **一键配置**：`/validation-setup` 自动完成配置
- ✅ **状态查询**：`/validation-status` 查看插件状态
- ✅ **冲突检测**：发现记忆矛盾时记录到 `CONFLICTS.md`
- ✅ **记忆审计**：`/audit-memory` 生成记忆健康报告（**v1.3.0 新增**）

### life-immunity (开发中)
- 🚧 **安全审计**：一键加固
- 🚧 **高危拦截**：实时检测危险命令
- 🚧 **沙箱配置**：生成 Docker 沙箱配置建议

## 📦 快速安装

```bash
# 安装 life-memory
npm install -g openclaw-plugin-life-memory@latest

# 安装 life-validation
npm install -g openclaw-plugin-life-validation@latest

# 安装 life-immunity（开发中）
npm install -g openclaw-plugin-life-immunity@latest

