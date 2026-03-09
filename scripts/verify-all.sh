#!/bin/bash
# OpenClaw 部署验证脚本

echo "🔍 验证四重进化效果..."
echo "========================"

# 1. 验证记忆主权
echo "🧠 记忆主权: $(openclaw config get compaction.mode)"

# 2. 验证安全配置
echo "🛡️ 免疫系统: $(openclaw security audit --deep | grep 'PASS' | wc -l) 项通过"

# 3. 验证多Agent（如果配置了）
if openclaw agents list &>/dev/null; then
    echo "🤝 社交化记忆: $(openclaw agents list | wc -l) 个Agent"
fi

echo "========================"
echo "✅ 验证完成"