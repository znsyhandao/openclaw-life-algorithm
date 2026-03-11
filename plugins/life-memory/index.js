const core = require('./lib/memory-core');

/**
 * life-memory 插件
 * 
 * 基于 OpenClaw ContextEngine 接口的记忆主权插件
 * 功能：透明存储、自动沉淀、冲突检测
 */

module.exports = {
  name: 'life-memory',
  version: '1.0.0',
  description: '记忆主权插件 - 透明、可编辑、Git友好的记忆管理',
  
  // 插件钩子
  hooks: {
    /**
     * bootstrap: 会话启动时加载长期记忆
     */
    async bootstrap(context) {
      const { agentId } = context;
      
      try {
        const memory = core.readLife(agentId);
        
        // 记录启动日志
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
      
      // 只处理最新的一轮对话
      const lastMessages = messages.slice(-2); // 最近一轮的用户+AI
      const insights = core.extractInsights(lastMessages);
      
      if (insights.length > 0) {
        // 写入今日日志
        insights.forEach(insight => {
          core.appendToTodayLog(agentId, insight);
        });
        
        // 检测冲突
        const existing = core.readLife(agentId);
        const conflicts = core.detectConflicts(insights, existing);
        
        if (conflicts.length > 0) {
          // 如果有冲突，记录到冲突日志
          const conflictFile = path.join(core.getMemoryDir(agentId), 'CONFLICTS.md');
          const conflictEntry = `\n## 冲突检测 (${new Date().toISOString()})\n${JSON.stringify(conflicts, null, 2)}`;
          fs.appendFileSync(conflictFile, conflictEntry);
          
          return {
            insights,
            conflicts,
            needsReview: true
          };
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
      
      if (insights && insights.length > 0) {
        // 将本轮提取的洞察写入长期记忆
        insights.forEach(insight => {
          core.appendToLife(agentId, insight);
        });
        
        return { 
          saved: insights.length,
          message: `已保存 ${insights.length} 条新记忆`
        };
      }
      
      return { saved: 0 };
    },
    
    /**
     * compact: 记忆压缩时清理旧数据
     */
    async compact(context) {
      const { agentId } = context;
      
      // 简单的压缩策略：保留最近30天的日志
      const memoryDir = core.getMemoryDir(agentId);
      const files = fs.readdirSync(memoryDir);
      
      // 找到所有日期文件（YYYY-MM-DD.md）
      const dateFiles = files.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
      
      if (dateFiles.length > 30) {
        // 按文件名排序（即按日期排序）
        dateFiles.sort();
        
        // 删除超过30天的旧文件
        const toDelete = dateFiles.slice(0, dateFiles.length - 30);
        toDelete.forEach(file => {
          fs.unlinkSync(path.join(memoryDir, file));
        });
        
        return {
          compacted: toDelete.length,
          message: `已清理 ${toDelete.length} 个旧日志文件`
        };
      }
      
      return { compacted: 0 };
    }
  },
  
  // 提供 slash 命令支持
  commands: {
    async remember(context, args) {
      // /remember 用户名字是 憨道
      const { agentId } = context;
      const content = args.join(' ');
      
      core.appendToLife(agentId, `- ${content}`);
      
      return {
        message: '✅ 已记住: ' + content
      };
    },
    
    async recall(context, args) {
      // /recall 名字
      const { agentId } = context;
      const keyword = args.join(' ');
      const memory = core.readLife(agentId);
      
      // 简单的搜索
      const lines = memory.split('\n');
      const matches = lines.filter(line => line.includes(keyword));
      
      if (matches.length > 0) {
        return {
          message: '🔍 找到以下记忆:\n' + matches.join('\n')
        };
      }
      
      return {
        message: '没有找到相关记忆'
      };
    }
  }
};
