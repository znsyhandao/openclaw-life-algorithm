# update-life-memory-v1.1.1.ps1 - 最终修复版（修正 here-string 格式）
# 一键更新 life-memory 到 v1.1.1（修改命令名避免冲突）

Write-Host "🚀 开始一键更新 life-memory 到 v1.1.1..." -ForegroundColor Cyan

$rootDir = "C:\Users\cqs10\openclaw-life-algorithm"
$pluginDir = "$rootDir\plugins\life-memory"

# ==================== 1. 更新 package.json ====================
Write-Host "`n📦 更新 package.json..." -ForegroundColor Yellow
$pkgPath = "$pluginDir\package.json"
$pkgContent = @'
{
  "name": "openclaw-plugin-life-memory",
  "version": "1.1.1",
  "description": "记忆主权插件 - 透明、可编辑、Git友好的OpenClaw记忆管理（支持 /memory-setup 一键配置）",
  "main": "index.js",
  "files": [
    "index.js",
    "lib/",
    "openclaw.plugin.json"
  ],
  "openclaw": {
    "extensions": [
      "./index.js"
    ]
  },
  "keywords": [
    "openclaw",
    "plugin",
    "memory",
    "context-engine",
    "life-algorithm",
    "one-click"
  ],
  "author": "cqs10",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/cqs10/openclaw-life-algorithm.git"
  }
}
'@
$pkgContent | Set-Content -Path $pkgPath -Encoding UTF8
Write-Host "  ✅ package.json 已更新到 v1.1.1" -ForegroundColor Green

# ==================== 2. 更新 index.js ====================
Write-Host "`n📝 更新 index.js（修改命令名）..." -ForegroundColor Yellow
$indexPath = "$pluginDir\index.js"
$indexContent = @'
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const core = require('./lib/memory-core');

/**
 * life-memory 插件
 * 
 * 基于 OpenClaw ContextEngine 接口的记忆主权插件
 * 功能：透明存储、自动沉淀、冲突检测
 * 版本: 1.1.1
 * 修改: 命令名改为 memory-setup/memory-status 避免与内置冲突
 */

module.exports = {
  name: 'life-memory',
  version: '1.1.1',
  description: '记忆主权插件 - 透明、可编辑、Git友好的记忆管理（支持 /memory-setup 一键配置）',
  
  hooks: {
    async bootstrap(context) {
      const { agentId } = context;
      try {
        const memory = core.readLife(agentId);
        core.appendToTodayLog(agentId, '- AI会话启动，加载长期记忆');
        return { longTerm: memory, memoryPath: core.getLifeFile(agentId) };
      } catch (err) {
        console.error('记忆加载失败:', err);
        return { longTerm: '' };
      }
    },
    
    async ingest(context) {
      const { agentId, messages } = context;
      const fs = require('fs');
      const path = require('path');
      
      const lastMessages = messages.slice(-2);
      const insights = core.extractInsights(lastMessages);
      
      if (insights.length > 0) {
        insights.forEach(insight => core.appendToTodayLog(agentId, insight));
        const existing = core.readLife(agentId);
        const conflicts = core.detectConflicts(insights, existing);
        
        if (conflicts.length > 0) {
          const conflictFile = path.join(core.getMemoryDir(agentId), 'CONFLICTS.md');
          const conflictEntry = `\n## 冲突检测 (${new Date().toISOString()})\n${JSON.stringify(conflicts, null, 2)}`;
          fs.appendFileSync(conflictFile, conflictEntry);
          return { insights, conflicts, needsReview: true };
        }
        return { insights };
      }
      return { insights: [] };
    },
    
    async afterTurn(context) {
      const { agentId, insights } = context;
      if (insights?.length > 0) {
        insights.forEach(insight => core.appendToLife(agentId, insight));
        return { saved: insights.length };
      }
      return { saved: 0 };
    },
    
    async compact(context) {
      const { agentId } = context;
      const fs = require('fs');
      const path = require('path');
      
      const memoryDir = core.getMemoryDir(agentId);
      if (!fs.existsSync(memoryDir)) return { compacted: 0 };
      
      const files = fs.readdirSync(memoryDir);
      const dateFiles = files.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
      
      if (dateFiles.length > 30) {
        dateFiles.sort();
        const toDelete = dateFiles.slice(0, dateFiles.length - 30);
        toDelete.forEach(file => fs.unlinkSync(path.join(memoryDir, file)));
        return { compacted: toDelete.length };
      }
      return { compacted: 0 };
    }
  },
  
  commands: {
    async 'memory-setup'(context, args) {
      const steps = [];
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      
      try {
        steps.push('🔧 开始配置 life-memory...');
        
        let config = {};
        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          config = JSON.parse(configContent);
          steps.push('✅ 读取现有配置成功');
        } catch {
          config = {
            gateway: {
              mode: "local",
              port: 18789,
              bind: "loopback",
              auth: { 
                mode: "token", 
                token: require('crypto').randomBytes(16).toString('hex')
              }
            }
          };
          steps.push('🆕 创建新配置文件');
        }
        
        if (config.contextEngine?.chain) {
          if (!config.contextEngine.chain.includes('life-memory')) {
            config.contextEngine.chain.push('life-memory');
            steps.push('✅ 已将 life-memory 添加到插件链');
          } else {
            steps.push('ℹ️ life-memory 已在插件链中');
          }
        } else if (config.contextEngine?.plugin) {
          const existing = config.contextEngine.plugin;
          config.contextEngine = { chain: [existing, 'life-memory'] };
          steps.push(`✅ 已将插件链配置为: ${existing} → life-memory`);
        } else {
          config.contextEngine = { plugin: 'life-memory' };
          steps.push('✅ 已将 life-memory 设为默认插件');
        }
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        steps.push('✅ 配置文件已更新');
        
        steps.push('🔄 正在重启 gateway...');
        try {
          await execPromise('openclaw gateway restart');
          steps.push('✅ gateway 重启成功');
        } catch {
          try {
            await execPromise('openclaw gateway start');
            steps.push('✅ gateway 启动成功');
          } catch {
            steps.push('⚠️ gateway 自动启动失败，请手动运行: openclaw gateway start');
          }
        }
        
        return {
          message: "🎉 life-memory 配置完成！\n\n" +
                   steps.join('\n') +
                   "\n\n📝 现在你可以测试：\n" +
                   "/remember 我的名字是XXX\n" +
                   "/recall 名字"
        };
      } catch (err) {
        return { message: "❌ 配置失败: " + err.message };
      }
    },
    
    async 'memory-status'(context, args) {
      const { agentId } = context;
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      const memoryDir = core.getMemoryDir(agentId);
      const lifeFile = core.getLifeFile(agentId);
      
      try {
        let configStatus = '❌ 未配置';
        let chainInfo = '';
        
        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          if (config.contextEngine?.plugin === 'life-memory') {
            configStatus = '✅ 已配置为唯一插件';
          } else if (config.contextEngine?.chain?.includes('life-memory')) {
            configStatus = '✅ 已在插件链中';
            chainInfo = `插件链: ${config.contextEngine.chain.join(' → ')}`;
          } else {
            configStatus = '⚠️ 未启用（运行 /memory-setup 配置）';
          }
        } catch {
          configStatus = '❌ 配置文件不存在';
        }
        
        let dirExists = false, fileExists = false, memoryStats = '';
        try {
          await fs.access(memoryDir);
          dirExists = true;
          try {
            await fs.access(lifeFile);
            fileExists = true;
            const content = await fs.readFile(lifeFile, 'utf8');
            const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
            memoryStats = `📊 记忆条目: ${lines.length}`;
          } catch {
            memoryStats = '📊 记忆文件尚未创建';
          }
        } catch {
          memoryStats = '📊 记忆目录尚未创建';
        }
        
        const pkgPath = path.join(__dirname, 'package.json');
        let version = 'unknown';
        try {
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
          version = pkg.version;
        } catch {}
        
        return {
          message: `📊 life-memory v${version} 状态\n\n` +
                   `🔧 配置状态: ${configStatus}\n` +
                   `${chainInfo ? chainInfo + '\n' : ''}` +
                   `📁 记忆目录: ${dirExists ? '✅ 存在' : '⏳ 未创建'}\n` +
                   `📄 记忆文件: ${fileExists ? '✅ 存在' : '⏳ 未创建'}\n` +
                   `${memoryStats}\n\n` +
                   `💡 首次使用请运行 /memory-setup 一键配置`
        };
      } catch (err) {
        return { message: "❌ 状态查询失败: " + err.message };
      }
    },
    
    async remember(context, args) {
      const { agentId } = context;
      const content = args.join(' ');
      if (!content) return { message: '用法: /remember <要记住的内容>', error: true };
      core.appendToLife(agentId, `- ${content}`);
      return { message: '✅ 已记住: ' + content };
    },
    
    async recall(context, args) {
      const { agentId } = context;
      const keyword = args.join(' ');
      if (!keyword) return { message: '用法: /recall <关键词>', error: true };
      
      const memory = core.readLife(agentId);
      const lines = memory.split('\n');
      const matches = lines.filter(line => line.includes(keyword) && line.startsWith('-'));
      
      if (matches.length > 0) {
        return { message: '🔍 找到以下记忆:\n' + matches.join('\n') };
      }
      return { message: '没有找到相关记忆' };
    }
  }
};
'@
$indexContent | Set-Content -Path $indexPath -Encoding UTF8
Write-Host "  ✅ index.js 已更新（命令名改为 memory-setup/memory-status）" -ForegroundColor Green

# ==================== 3. 更新插件 README ====================
Write-Host "`n📖 更新插件 README..." -ForegroundColor Yellow
$readmePath = "$pluginDir\README.md"
$readmeContent =
 @'
# 🧠 life-memory - OpenClaw 记忆主权插件

> 让AI真正记住你——透明、可编辑、Git友好的记忆管理

[![npm version](https://img.shields.io/npm/v/openclaw-plugin-life-memory.svg)](https://www.npmjs.com/package/openclaw-plugin-life-memory)
[![npm downloads](https://img.shields.io/npm/dm/openclaw-plugin-life-memory.svg)](https://www.npmjs.com/package/openclaw-plugin-life-memory)

## ✨ 特性

- ✅ **透明存储**：所有记忆以 Markdown 格式保存在 `~/clawd/memory/`
- ✅ **自动沉淀**：每轮对话后自动提取重要信息
- ✅ **版本控制**：天然支持 Git 管理
- ✅ **冲突检测**：发现记忆矛盾时记录到 `CONFLICTS.md`
- ✅ **一键配置**：`/memory-setup` 自动完成配置

## 📦 安装

```bash
npm install -g openclaw-plugin-life-memory@latest
'@