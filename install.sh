#!/bin/bash
# AI生命算法 v2.0 一键安装脚本
# 真正的可用版本！会下载插件并配置

set -e

echo "🚀 开始安装 AI生命算法 v2.0..."

REPO="znsyhandao/openclaw-life-algorithm"
BRANCH="main"

# 创建必要的目录
echo "📁 创建插件目录..."
mkdir -p ~/.openclaw/extensions/
mkdir -p ~/.openclaw/config.d/
mkdir -p ~/clawd/memory/

# 下载插件文件
echo "📥 下载记忆主权插件..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/plugins/life-memory/index.js" \
     -o ~/.openclaw/extensions/life-memory.js || {
  echo "❌ 下载失败，请检查网络"
  exit 1
}

echo "📥 下载验证层插件..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/plugins/life-validator/index.js" \
     -o ~/.openclaw/extensions/life-validator.js || {
  echo "❌ 下载失败，请检查网络"
  exit 1
}

# 创建配置文件
echo "⚙️ 配置 ContextEngine..."
cat > ~/.openclaw/config.d/life-algorithm.json << 'CONFIG_EOF'
{
  "contextEngine": {
    "plugins": ["life-memory", "life-validator"],
    "defaultPlugin": "life-memory"
  }
}
CONFIG_EOF

# 检查 OpenClaw 版本
if command -v openclaw &> /dev/null; then
  VERSION=$(openclaw --version | head -n1)
  echo "✅ 检测到 OpenClaw $VERSION"
  
  # 如果是 3.8 以下，给出提示
  if [[ $VERSION != *"2026.3.8"* ]]; then
    echo "⚠️ 当前版本不是 2026.3.8，建议升级: npm install -g openclaw@latest"
  fi
else
  echo "⚠️ 未检测到 OpenClaw，请先安装: npm install -g openclaw@latest"
fi

# 重启服务
echo "🔄 重启 OpenClaw 服务..."
openclaw gateway restart 2>/dev/null || echo "请手动重启: openclaw gateway restart"

# 验证安装
echo ""
echo "✅ AI生命算法 v2.0 安装完成！"
echo ""
echo "📌 插件位置: ~/.openclaw/extensions/"
echo "📌 记忆目录: ~/clawd/memory/"
echo "📌 配置文件: ~/.openclaw/config.d/life-algorithm.json"
echo ""
echo "🔍 验证方法:"
echo "  ls -la ~/.openclaw/extensions/  # 应该看到两个插件"
echo "  cat ~/clawd/memory/LIFE.md       # 记忆文件"
echo ""
echo "🦞 你的龙虾现在有灵魂了！"
