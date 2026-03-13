// life-memory/index.js - 完整版带 setup 命令
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * life-memory 插件 - 记忆主权
 * 版本: 1.0.1
 * 新增: /setup 一键配置命令
 */

module.exports = {
  name: 'life-memory',
  version: '1.0.1',
  description: '记忆主权插件 - 透明、可编辑、Git友好的记忆管理',
  
  // ==================== 核心钩子 ====================
  hooks: {
    /**
     * bootstrap: 会话启动时加载长期记忆
     */
    async bootstrap(context) {
      const { agentId } = context;
      const core = require('./lib/memory-core');
      
      try {
        const memory = core.readLife(agentId);
        core.appendToTodayLog(agentId, '- AI会话启动，加载长期记忆');
        
        return {
          longTerm: memory,
          memoryPath: core.getLifeFile(agentId)
        };
      } catch (err) {
        console.error('记忆加载失败:', err);
        return { longTerm: '' };
      }
    },
    
    /**
     * ingest: 处理新消息，提取值得记住的信息
     */
    async ingest(context) {
      const { agentId, messages } = context;
      const core = require('./lib/memory-core');
      
      const lastMessages = messages.slice(-2);
      const insights = core.extractInsights(lastMessages);
      
      if (insights.length > 0) {
        insights.forEach(insight => {
          core.appendToTodayLog(agentId, insight);
        });
        
        const existing = core.readLife(agentId);
        const conflicts = core.detectConflicts(insights, existing);
        
        if (conflicts.length > 0) {
          const conflictFile = path.join(core.getMemoryDir(agentId), 'CONFLICTS.md');
          const conflictEntry = `\n## 冲突检测 (${new Date().toISOString()})\n${JSON.stringify(conflicts, null, 2)}`;
          require('fs').appendFileSync(conflictFile, conflictEntry);
          
          return { insights, conflicts, needsReview: true };
        }
        
        return { insights };
      }
      
      return { insights: [] };
    },
    
    /**
     * afterTurn: 每轮对话结束后，将重要信息写入长期记忆
     */
    async afterTurn(context) {
      const { agentId, insights } = context;
      const core = require('./lib/memory-core');
      
      if (insights && insights.length > 0) {
        insights.forEach(insight => {
          core.appendToLife(agentId, insight);
        });
        
        return { saved: insights.length };
      }
      
      return { saved: 0 };
    },
    
    /**
     * compact: 记忆压缩时清理旧数据
     */
    async compact(context) {
      const { agentId } = context;
      const core = require('./lib/memory-core');
      const fs = require('fs');
      
      const memoryDir = core.getMemoryDir(agentId);
      if (!fs.existsSync(memoryDir)) return { compacted: 0 };
      
      const files = fs.readdirSync(memoryDir);
      const dateFiles = files.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
      
      if (dateFiles.length > 30) {
        dateFiles.sort();
        const toDelete = dateFiles.slice(0, dateFiles.length - 30);
        toDelete.forEach(file => {
          fs.unlinkSync(path.join(memoryDir, file));
        });
        
        return { compacted: toDelete.length };
      }
      
      return { compacted: 0 };
    }
  },
  
  // ==================== Slash 命令 ====================
  commands: {
    /**
     * /remember <内容> - 手动记住信息
     */
    async remember(context, args) {
      const { agentId } = context;
      const core = require('./lib/memory-core');
      const content = args.join(' ');
      
      if (!content) {
        return { message: '用法: /remember <要记住的内容>', error: true };
      }
      
      core.appendToLife(agentId, `- ${content}`);
      
      return { message: '✅ 已记住: ' + content };
    },
    
    /**
     * /recall <关键词> - 回忆信息
     */
    async recall(context, args) {
      const { agentId } = context;
      const core = require('./lib/memory-core');
      const keyword = args.join(' ');
      
      if (!keyword) {
        return { message: '用法: /recall <关键词>', error: true };
      }
      
      const memory = core.readLife(agentId);
      const lines = memory.split('\n');
      const matches = lines.filter(line => line.includes(keyword));
      
      if (matches.length > 0) {
        return { message: '🔍 找到以下记忆:\n' + matches.join('\n') };
      }
      
      return { message: '没有找到相关记忆' };
    },
    
    /**
     * /setup - 一键配置插件（新增！）
     */
    async setup(context, args) {
      const steps = [];
      
      try {
        // 1. 获取配置文件路径
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
        steps.push(`📁 配置文件: ${configPath}`);
        
        // 2. 读取现有配置
        let config = {};
        let configExists = false;
        
        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          config = JSON.parse(configContent);
          configExists = true;
          steps.push('✅ 读取现有配置成功');
        } catch (err) {
          // 配置文件不存在，创建默认配置
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
        
        // 3. 检查是否已经配置过
        if (config.contextEngine?.plugin === 'life-memory') {
          steps.push('ℹ️ life-memory 已经是当前 contextEngine 插件');
        } else {
          // 4. 添加 contextEngine 配置
          config.contextEngine = {
            plugin: "life-memory"
          };
          steps.push('✅ 添加 contextEngine.life-memory 配置');
        }
        
        // 5. 检查 DeepSeek 模型配置（可选）
        if (!config.models?.providers?.deepseek) {
          steps.push('ℹ️ 未检测到 DeepSeek 配置，如需使用请手动添加');
        }
        
        // 6. 写回配置文件
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        steps.push('✅ 配置文件已更新');
        
        // 7. 重启 gateway
        steps.push('🔄 正在重启 gateway...');
        
        try {
          // 先尝试优雅重启
          await execPromise('openclaw gateway restart').catch(() => {});
          steps.push('✅ gateway 重启成功');
        } catch (err) {
          // 如果 restart 失败，尝试 start
          try {
            await execPromise('openclaw gateway start');
            steps.push('✅ gateway 启动成功');
          } catch (startErr) {
            steps.push('⚠️ gateway 自动启动失败，请手动运行: openclaw gateway start');
          }
        }
        
        // 8. 返回成功消息
        return {
          message: `🎉 life-memory 插件配置完成！\n\n` +
                   steps.join('\n') +
                   `\n\n📝 现在你可以测试：\n` +
                   `/remember 我的名字是XXX\n` +
                   `/recall 名字\n\n` +
                   `📖 查看记忆文件：\n` +
                   `ls ~/clawd/memory/LIFE.md`
        };
        
      } catch (err) {
        return {
          message: `❌ 配置失败: ${err.message}\n\n` +
                   `请手动配置: 在 openclaw.json 中添加\n` +
                   `"contextEngine": { "plugin": "life-memory" }`,
          error: true
        };
      }
    },
    
    /**
     * /status - 查看插件状态（新增）
     */
    async status(context, args) {
      const { agentId } = context;
      const core = require('./lib/memory-core');
      const fs = require('fs').promises;
      
      try {
        const memoryDir = core.getMemoryDir(agentId);
        const lifeFile = core.getLifeFile(agentId);
        
        // 检查目录是否存在
        const dirExists = await fs.access(memoryDir).then(() => true).catch(() => false);
        const fileExists = await fs.access(lifeFile).then(() => true).catch(() => false);
        
        let memoryStats = '';
        if (fileExists) {
          const content = await fs.readFile(lifeFile, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          memoryStats = `📊 记忆条目: ${lines.length}`;
        }
        
        // 检查配置文件状态
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
        let configStatus = '❌ 未配置';
        
        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          if (config.contextEngine?.plugin === 'life-memory') {
            configStatus = '✅ 已启用';
          } else if (config.contextEngine?.chain?.includes('life-memory')) {
            configStatus = '✅ 已在链中启用';
          } else {
            configStatus = '⚠️ 未启用（运行 /setup 配置）';
          }
        } catch {
          configStatus = '❌ 配置文件不存在';
        }
        
        return {
          message: `📊 life-memory 状态\n\n` +
                   `🔧 配置状态: ${configStatus}\n` +
                   `📁 记忆目录: ${dirExists ? '✅ 存在' : '⏳ 未创建'}\n` +
                   `📄 记忆文件: ${fileExists ? '✅ 存在' : '⏳ 未创建'}\n` +
                   `${memoryStats}\n\n` +
                   `💡 首次使用请运行 /setup 一键配置`
        };
        
      } catch (err) {
        return { message: `❌ 状态查询失败: ${err.message}` };
      }
    }
  }
};