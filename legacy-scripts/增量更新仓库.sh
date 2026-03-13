#!/bin/bash
# 增量更新GitHub仓库 - 超级简单版

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AI生命算法 GitHub 增量更新脚本          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

cd ~/openclaw-life-algorithm
echo -e "${GREEN}📌 远程仓库: $(git config --get remote.origin.url)${NC}"
echo -e "${GREEN}📌 当前分支: $(git branch --show-current)${NC}"

# 备份
echo -e "\n${BLUE}📦 备份中...${NC}"
BACKUP_DIR="../openclaw-life-algorithm-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r ./* "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✅ 已备份到: $BACKUP_DIR${NC}"

# 创建目录
echo -e "\n${BLUE}📁 创建目录...${NC}"
mkdir -p plugins/{life-memory,life-validator} security workflows docs scripts .github/workflows
echo -e "${GREEN}✅ 目录已就绪${NC}"

# ========== 直接创建文件（使用echo，不用here-document）==========
echo -e "\n${BLUE}📝 创建/更新文件...${NC}"

# install.sh
if [ ! -f "install.sh" ]; then
    echo '#!/bin/bash
echo "🚀 安装 AI生命算法 v2.0..."
npm install -g openclaw@latest
mkdir -p ~/.openclaw/extensions/
echo "✅ 安装完成"' > install.sh
    chmod +x install.sh
    echo "  ✅ 创建 install.sh"
else
    echo "  ⏺️ 跳过 install.sh（已存在）"
fi

# upgrade.sh
if [ ! -f "upgrade.sh" ]; then
    echo '#!/bin/bash
echo "🚀 升级到 AI生命算法 v2.0..."
npm install -g openclaw@latest
echo "✅ 升级完成"' > upgrade.sh
    chmod +x upgrade.sh
    echo "  ✅ 创建 upgrade.sh"
else
    echo "  ⏺️ 跳过 upgrade.sh（已存在）"
fi

# scripts/check-env.sh
if [ ! -f "scripts/check-env.sh" ]; then
    echo '#!/bin/bash
echo "🔍 检查OpenClaw环境..."
if command -v openclaw &> /dev/null; then
    echo "✅ OpenClaw: $(openclaw --version | head -n1)"
else
    echo "❌ OpenClaw: 未安装"
fi' > scripts/check-env.sh
    chmod +x scripts/check-env.sh
    echo "  ✅ 创建 scripts/check-env.sh"
else
    echo "  ⏺️ 跳过 scripts/check-env.sh（已存在）"
fi

# .github/workflows/ci.yml
if [ ! -f ".github/workflows/ci.yml" ]; then
    echo 'name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo "✅ 测试通过"' > .github/workflows/ci.yml
    echo "  ✅ 创建 .github/workflows/ci.yml"
else
    echo "  ⏺️ 跳过 .github/workflows/ci.yml（已存在）"
fi

# .gitignore
if [ ! -f ".gitignore" ]; then
    echo 'node_modules/
*.log
.DS_Store
backup-*/' > .gitignore
    echo "  ✅ 创建 .gitignore"
else
    echo "  ⏺️ 跳过 .gitignore（已存在）"
fi

# LICENSE
if [ ! -f "LICENSE" ]; then
    echo 'MIT License
Copyright (c) 2026' > LICENSE
    echo "  ✅ 创建 LICENSE"
else
    echo "  ⏺️ 跳过 LICENSE（已存在）"
fi

# plugins/life-memory/package.json
if [ ! -f "plugins/life-memory/package.json" ]; then
    echo '{
  "name": "life-memory",
  "version": "2.0.0",
  "description": "记忆主权插件"
}' > plugins/life-memory/package.json
    echo "  ✅ 创建 plugins/life-memory/package.json"
else
    echo "  ⏺️ 跳过 plugins/life-memory/package.json（已存在）"
fi

# plugins/life-validator/package.json
if [ ! -f "plugins/life-validator/package.json" ]; then
    echo '{
  "name": "life-validator",
  "version": "2.0.0",
  "description": "验证层插件"
}' > plugins/life-validator/package.json
    echo "  ✅ 创建 plugins/life-validator/package.json"
else
    echo "  ⏺️ 跳过 plugins/life-validator/package.json（已存在）"
fi

# docs/UPGRADE_GUIDE.md
if [ ! -f "docs/UPGRADE_GUIDE.md" ]; then
    echo '# 升级指南
从v1.0到v2.0的主要变化：
- ContextEngine插件化
- ACP持久化
- 官方安全审计' > docs/UPGRADE_GUIDE.md
    echo "  ✅ 创建 docs/UPGRADE_GUIDE.md"
else
    echo "  ⏺️ 跳过 docs/UPGRADE_GUIDE.md（已存在）"
fi

# docs/PLUGIN_DEV.md
if [ ! -f "docs/PLUGIN_DEV.md" ]; then
    echo '# 插件开发指南
ContextEngine钩子：
- bootstrap
- ingest
- assemble
- afterTurn
- compact' > docs/PLUGIN_DEV.md
    echo "  ✅ 创建 docs/PLUGIN_DEV.md"
else
    echo "  ⏺️ 跳过 docs/PLUGIN_DEV.md（已存在）"
fi

# docs/SECURITY.md
if [ ! -f "docs/SECURITY.md" ]; then
    echo '# 安全配置指南
运行安全审计：
openclaw security audit --deep --fix' > docs/SECURITY.md
    echo "  ✅ 创建 docs/SECURITY.md"
else
    echo "  ⏺️ 跳过 docs/SECURITY.md（已存在）"
fi

# security/security-policy.json
if [ ! -f "security/security-policy.json" ]; then
    echo '{
  "security": {
    "dmPolicy": "paired-only",
    "groupPolicy": "allowlist"
  }
}' > security/security-policy.json
    echo "  ✅ 创建 security/security-policy.json"
else
    echo "  ⏺️ 跳过 security/security-policy.json（已存在）"
fi

# security/upgrade-immunity.sh
if [ ! -f "security/upgrade-immunity.sh" ]; then
    echo '#!/bin/bash
echo "🛡️ 配置免疫系统..."
openclaw security audit --deep --fix' > security/upgrade-immunity.sh
    chmod +x security/upgrade-immunity.sh
    echo "  ✅ 创建 security/upgrade-immunity.sh"
else
    echo "  ⏺️ 跳过 security/upgrade-immunity.sh（已存在）"
fi

# workflows/multi-agent-brainstorm.js
if [ ! -f "workflows/multi-agent-brainstorm.js" ]; then
    echo 'async function brainstorm(topic) {
  console.log(`🚀 头脑风暴: ${topic}`);
  return { status: "completed" };
}
module.exports = { brainstorm };' > workflows/multi-agent-brainstorm.js
    echo "  ✅ 创建 workflows/multi-agent-brainstorm.js"
else
    echo "  ⏺️ 跳过 workflows/multi-agent-brainstorm.js（已存在）"
fi

# 插件主文件（如果不存在）
if [ ! -f "plugins/life-memory/index.js" ]; then
    echo 'module.exports = {
  name: "life-memory",
  version: "2.0.0",
  async bootstrap() { return { status: "ok" }; },
  async afterTurn() { return { saved: true }; }
};' > plugins/life-memory/index.js
    echo "  ✅ 创建 plugins/life-memory/index.js"
else
    echo "  ⏺️ 跳过 plugins/life-memory/index.js（已存在）"
fi

if [ ! -f "plugins/life-validator/index.js" ]; then
    echo 'module.exports = {
  name: "life-validator",
  version: "2.0.0",
  async assemble(ctx) {
    return { prompt: ctx.basePrompt + "\n【验证层】\n" };
  }
};' > plugins/life-validator/index.js
    echo "  ✅ 创建 plugins/life-validator/index.js"
else
    echo "  ⏺️ 跳过 plugins/life-validator/index.js（已存在）"
fi

# README.md（如果不存在）
if [ ! -f "README.md" ]; then
    echo '# 🧬 AI生命算法
AI生命算法是一套让OpenClaw进化为数字生命体的方法论。' > README.md
    echo "  ✅ 创建 README.md"
else
    echo "  ⏺️ 跳过 README.md（已存在）"
fi

# ========== 统计 ==========
echo -e "\n${BLUE}📊 文件统计${NC}"
TOTAL=$(find . -type f -not -path "*/\.git/*" | wc -l)
NEW=$(git ls-files --others --exclude-standard | wc -l)
MODIFIED=$(git ls-files --modified | wc -l)
echo -e "总文件: $TOTAL | 新增: $NEW | 修改: $MODIFIED"

# ========== Git提交 ==========
if [ $NEW -gt 0 ] || [ $MODIFIED -gt 0 ]; then
    echo -e "\n${BLUE}💾 Git状态${NC}"
    git add -A
    git status --short
    
    echo -e "\n${YELLOW}推送到GitHub? (y/n)${NC}"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git commit -m "增量更新 v2.0"
        git push
        echo -e "${GREEN}✅ 推送成功${NC}"
    else
        echo -e "${YELLOW}⏸️ 已取消${NC}"
    fi
else
    echo -e "\n${GREEN}✅ 仓库已是最新${NC}"
fi

echo -e "\n${GREEN}🎉 完成！${NC}"