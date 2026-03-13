#!/bin/bash
# OpenClaw 环境检查脚本

echo "🔍 OpenClaw 环境检查"
echo "===================="

# 检查 OpenClaw
if command -v openclaw &> /dev/null; then
    echo "✅ OpenClaw 已安装"
else
    echo "❌ OpenClaw 未安装"
fi

# 检查 Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js 已安装"
else
    echo "❌ Node.js 未安装"
fi

# 检查 Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker 已安装"
else
    echo "⚠️ Docker 未安装（可选）"
fi