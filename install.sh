#!/bin/bash
# AI生命算法 一键安装脚本

set -e
echo "🚀 安装 AI生命算法 v2.0..."

REPO="znsyhandao/openclaw-life-algorithm"
BRANCH="main"

# 创建插件目录
mkdir -p ~/.openclaw/extensions/

# 下载插件文件
echo "📥 下载记忆主权插件..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/plugins/life-memory/index.js" \
     -o ~/.openclaw/extensions/life-memory.js

echo "📥 下载验证层插件..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/plugins/life-validator/index.js" \
     -o ~/.openclaw/extensions/life-validator.js

echo "✅ 安装完成"
echo "运行以下命令重启服务: openclaw gateway restart"
