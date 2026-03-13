# 📁 生命算法 v1.0 历史脚本

本目录存放的是 **“生命算法 v1.0”** 的手动脚本版本。

## 📅 归档时间
2026年3月11日 - 所有 v1.0 脚本已迁移至此目录

## 📋 脚本清单

| 文件名 | 功能 | 状态 | 替代方案 |
| :--- | :--- | :--- | :--- |
| `check-env.sh` | 检查 OpenClaw 运行环境 | ✅ 可用 | `openclaw doctor` |
| `install.sh` | 一键安装脚本（旧版） | ✅ 可用 | 官方 npm 安装 |
| `install.sh.tmp` | 安装脚本备份 | ⏸️ 存档 | 可忽略 |
| `update-github-repo.sh` | 更新 GitHub 仓库 | ✅ 可用 | `git pull` |
| `upgrade.sh` | OpenClaw 升级脚本（旧版） | ✅ 可用 | `npm update -g openclaw` |
| `upgrade.sh.tmp` | 升级脚本备份 | ⏸️ 存档 | 可忽略 |
| `增量更新仓库.sh` | 中文版更新脚本 | ✅ 可用 | `git pull` |
| `test-memory.cjs` | 记忆功能测试（CommonJS） | ✅ 可用 | `life-memory` 插件 |
| `test-memory.js` | 记忆功能测试（ES Module） | ✅ 可用 | `life-memory` 插件 |
| `.gitignore.tmp` | Git 忽略文件临时备份 | ⏸️ 存档 | 可忽略 |
| `LICENSE.tmp` | 许可证文件临时备份 | ⏸️ 存档 | 可忽略 |

## 🔧 如何使用这些脚本（老用户专用）

如果你习惯用旧版脚本，可以继续使用：

```bash
# 给所有脚本添加执行权限
chmod +x legacy-scripts/*.sh legacy-scripts/*.js

# 运行环境检查
./legacy-scripts/check-env.sh

# 运行记忆测试
node legacy-scripts/test-memory.js

