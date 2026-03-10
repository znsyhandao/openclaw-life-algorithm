#!/bin/bash
# OpenClaw 生命算法一键部署脚本
# 版本: 1.0.0
# 支持: Linux/macOS/Windows (Git Bash)

set -e

echo "🚀 OpenClaw 生命算法部署开始"
echo "=================================="

# 检测操作系统
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]]; then
    OS="windows"
fi

echo "📋 检测到操作系统: $OS"

# 如果是 Windows 且不是 Git Bash，给出提示
if [[ "$OS" == "windows" ]] && [[ -z "$BASH" ]]; then
    echo "❌ 请在 Git Bash 中运行此脚本"
    exit 1
fi

# 备份当前配置
BACKUP_FILE=~/openclaw-backup-$(date +%Y%m%d-%H%M%S).tar.gz
echo "💾 备份当前配置到: $BACKUP_FILE"
tar -czf "$BACKUP_FILE" ~/.openclaw ~/clawd 2>/dev/null || echo "⚠️ 备份完成（部分目录可能不存在）"

# 1. 记忆主权配置
echo "🧠 配置记忆主权..."
openclaw config set compaction.mode safeguard 2>/dev/null || echo "⚠️ 请确保 OpenClaw 已安装"
openclaw config set compaction.memoryFlush true 2>/dev/null

# 2. 免疫系统配置
echo "🛡️ 配置免疫系统..."
if [[ "$OS" == "windows" ]]; then
    echo "⚠️ Windows 下权限配置建议："
    echo "   以管理员身份运行 PowerShell："
    echo "   icacls \"$USERPROFILE\\.openclaw\" /inheritance:r /grant \"${USERNAME}:F\""
else
    chmod 700 ~/.openclaw 2>/dev/null || true
    chmod 600 ~/.openclaw/openclaw.json 2>/dev/null || true
fi

# 运行安全审计
openclaw security audit --fix 2>/dev/null || echo "⚠️ 安全审计需要 OpenClaw 2.6+"

# 3. 社交化记忆配置
echo "🤝 配置社交化记忆..."
# 检查是否已有 Agent
AGENT_COUNT=$(openclaw agents list 2>/dev/null | wc -l)
if [[ $AGENT_COUNT -lt 2 ]]; then
    echo "创建示例 Agent..."
    openclaw agents add work --workspace ~/.openclaw/workspace-work 2>/dev/null || echo "工作Agent已存在"
    openclaw agents add coding --workspace ~/.openclaw/workspace-coding 2>/dev/null || echo "代码Agent已存在"
else
    echo "✅ 已有 $AGENT_COUNT 个 Agent"
fi

# 4. 验证层准备
echo "✅ 准备验证层..."
mkdir -p ~/scripts
if [[ ! -f ~/scripts/sync-memory.js ]]; then
    echo "请手动复制 sync-memory.js 到 ~/scripts/ 目录"
fi

echo "=================================="
echo "✅ 部署完成！"
echo ""
echo "下一步："
echo "1. 重启 OpenClaw: openclaw gateway restart"
echo "2. 运行验证: bash scripts/verify-all.sh"
echo "3. 如有问题，恢复备份: tar -xzf $BACKUP_FILE"