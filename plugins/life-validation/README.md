# 🧠 life-validation - OpenClaw 验证层插件

> 教会AI分辨“该信什么”——冲突检测 + 可信度裁决 + 记忆审计

[![npm version](https://img.shields.io/npm/v/openclaw-plugin-life-validation.svg)](https://www.npmjs.com/package/openclaw-plugin-life-validation)
[![npm downloads](https://img.shields.io/npm/dm/openclaw-plugin-life-validation.svg)](https://www.npmjs.com/package/openclaw-plugin-life-validation)
[![latest version](https://img.shields.io/npm/v/openclaw-plugin-life-validation/1.3.0)](https://www.npmjs.com/package/openclaw-plugin-life-validation)

## ✨ 特性

- ✅ **可信度裁决**：根据来源给记忆打分
- ✅ **冲突检测**：发现记忆矛盾时记录到 `CONFLICTS.md`
- ✅ **一键配置**：`/validation-setup` 自动完成配置
- ✅ **状态查询**：`/validation-status` 查看插件状态
- ✅ **记忆审计**：`/audit-memory` 生成记忆健康报告（**v1.3.0 新增**）

## 📦 安装

```bash
# 通过 npm 安装（最新版 v1.3.0）
npm install -g openclaw-plugin-life-validation@latest