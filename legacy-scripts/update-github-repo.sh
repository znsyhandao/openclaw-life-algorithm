#!/bin/bash
# update-github-repo.sh - 一键更新GitHub上的openclaw-life-algorithm仓库
# 使用方法: 在仓库根目录运行 ./update-github-repo.sh

set -e

# ========== 颜色定义 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔄  AI生命算法 GitHub 仓库自动更新脚本  🔄                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 检查是否在git仓库中
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ 错误：当前目录不是git仓库${NC}"
    echo -e "请在 openclaw-life-algorithm 目录下运行此脚本"
    exit 1
fi

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📌 当前分支: ${CYAN}$CURRENT_BRANCH${NC}"

# ========== 1. 备份现有文件 ==========
echo -e "\n${BLUE}📦 步骤1: 备份现有文件${NC}"
BACKUP_DIR="../openclaw-life-algorithm-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r ./* "$BACKUP_DIR/" 2>/dev/null || true
cp .gitignore "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✅ 已备份到: $BACKUP_DIR${NC}"

# ========== 2. 创建完整的项目结构 ==========
echo -e "\n${BLUE}📁 步骤2: 创建项目结构${NC}"

# 创建目录
mkdir -p plugins/{life-memory,life-validator}
mkdir -p security workflows docs
mkdir -p .github/workflows

echo -e "${GREEN}✅ 目录结构创建完成${NC}"

# ========== 3. 生成所有文件 ==========
echo -e "\n${BLUE}📝 步骤3: 生成所有代码文件${NC}"

# ----- README.md -----
cat > README.md << 'README_EOF'
# 🧬 AI生命算法 - OpenClaw ContextEngine 时代

[![OpenClaw Version](https://img.shields.io/badge/OpenClaw-2026.3.8+-blue)](https://github.com/openclaw/openclaw)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 🌟 项目简介

**AI生命算法** 是一套让OpenClaw从“工具”进化为“数字生命体”的方法论。

## 🚀 一分钟快速安装

```bash
curl -fsSL https://raw.githubusercontent.com/你的用户名/openclaw-life-algorithm/main/install.sh | bash