#!/bin/bash
# OpenClaw 生命算法一键部署脚本

echo "🚀 开始部署记忆主权配置..."

# 1. 备份当前配置
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# 2. 应用记忆主权配置
openclaw config set compaction.mode safeguard
openclaw config set compaction.memoryFlush true

# 3. 应用安全配置
openclaw security audit --fix

echo "✅ 部署完成！"