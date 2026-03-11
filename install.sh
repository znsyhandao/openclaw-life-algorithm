#!/bin/bash
# AI生命算法 v2.0 一键安装脚本
# 支持在线下载和本地复制两种方式

set -e

echo "🚀 开始安装 AI生命算法 v2.0..."

REPO="znsyhandao/openclaw-life-algorithm"
BRANCH="main"

# 创建必要的目录
echo "📁 创建插件目录..."
mkdir -p ~/.openclaw/extensions/
mkdir -p ~/.openclaw/config.d/
mkdir -p ~/clawd/memory/

# 判断是否在仓库目录（有本地文件）
if [ -f "plugins/life-memory/index.js" ]; then
  echo "📦 检测到本地仓库，使用本地文件复制..."
  cp plugins/life-memory/index.js ~/.openclaw/extensions/life-memory.js
  cp plugins/life-validator/index.js ~/.openclaw/extensions/life-validator.js
else
  echo "📥 未检测到本地仓库，尝试从 GitHub 下载..."
  
  # 下载插件文件
  echo "📥 下载记忆主权插件..."
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/plugins/life-memory/index.js" \
       -o ~/.openclaw/extensions/life-memory.js || {
    echo "❌ 网络下载失败，请尝试以下方法："
    echo "   1. 检查网络后重试"
    echo "   2. 使用 git clone 本地安装："
    echo "      git clone https://github.com/$REPO.git"
    echo "      cd openclaw-life-algorithm"
    echo "      ./install.sh"
    exit 1
  }

  echo "📥 下载验证层插件..."
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/plugins/life-validator/index.js" \
       -o ~/.openclaw/extensions/life-validator.js || {
    echo "❌ 网络下载失败，请尝试本地安装"
    exit 1
  }
fi

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
else
  echo "⚠️ 未检测到 OpenClaw，请先安装: npm install -g openclaw@latest"
fi

# 重启服务（忽略错误，因为可能已经在运行）
echo "🔄 尝试重启 OpenClaw 服务..."
openclaw gateway restart 2>/dev/null || echo "ℹ️ Gateway 已在运行，无需重启"

# 验证安装
echo ""
echo "✅ AI生命算法 v2.0 安装完成！"
echo ""
echo "📌 插件位置: ~/.openclaw/extensions/"
echo "   $(ls ~/.openclaw/extensions/ 2>/dev/null | grep life || echo '暂无插件')"
echo "📌 记忆目录: ~/clawd/memory/"
echo "📌 配置文件: ~/.openclaw/config.d/life-algorithm.json"
echo ""
echo "🔍 验证方法:"
echo "  ls -la ~/.openclaw/extensions/  # 查看插件"
echo "  echo '测试消息' >> ~/clawd/memory/$(date +%Y-%m-%d).md  # 手动测试"
echo ""
echo "🦞 你的龙虾现在有灵魂了！"
echo ""
echo "📢 如果安装遇到问题："
echo "  1. 网络问题: git clone 后本地运行"
echo "  2. 权限问题: 以管理员身份运行 Git Bash"
echo "  3. 更多帮助: https://github.com/$REPO/issues"
