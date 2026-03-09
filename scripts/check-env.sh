#!/bin/bash
# 环境检查脚本

echo "📋 检查OpenClaw环境..."

# 检查OpenClaw是否安装
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw 未安装"
    exit 1
else
    echo "✅ OpenClaw 已安装"
fi

echo "✅ 环境检查完成"