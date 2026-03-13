# 🧠 life-validation - OpenClaw 验证层插件

> 教会AI分辨“该信什么”——冲突检测 + 可信度裁决

[![npm version](https://img.shields.io/npm/v/openclaw-plugin-life-validation.svg)](https://www.npmjs.com/package/openclaw-plugin-life-validation)
[![npm downloads](https://img.shields.io/npm/dm/openclaw-plugin-life-validation.svg)](https://www.npmjs.com/package/openclaw-plugin-life-validation)

## ✨ 特性

- ✅ **可信度裁决**：根据来源给记忆打分（用户明确说0.95 > 自然提及0.8 > AI推断0.6）
- ✅ **冲突检测**：发现新旧记忆矛盾时记录到 `CONFLICTS.md`
- ✅ **主动询问**：严重冲突时让用户裁决
- ✅ **slash命令**：支持 `/resolve` 和 `/conflicts`

## 📦 安装

```bash
# 通过 npm 安装
npm install -g openclaw-plugin-life-validation