// plugins/life-validation/index.js - 完整版 v1.1.0
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const core = require('./lib/validation-core');

/**
 * life-validation 插件
 * 
 * 验证层插件 - 冲突检测、可信度裁决
 * 版本: 1.1.0
 * 新增: /setup 一键配置, /status 状态查询
 */

module.exports = {
  name: 'life-validation',
  version: '1.1.0',
  description: '验证层插件 - 冲突检测、可信度裁决，让AI学会分辨该信什么',
  
  // ==================== 核心钩子 ====================
  hooks: {
    /**
     * assemble: 动态装配记忆，只选高可信度的
     */
    async assemble(context) {
      const { longTerm, currentTask, agentId } = context;
      
      if (!longTerm || longTerm.length === 0) {
        return { memory: [] };
      }
      
      // 只装配可信度 > 0.6 的记忆，最多10条
      const relevant = core.filterHighConfidence(longTerm, 0.6, 10);
      
      // 记录日志（可选）
      const logDir = path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'validation-logs');
      await fs.mkdir(logDir, { recursive: true }).catch(() => {});
      
      return {
        memory: relevant.map(m => m.text || m),
        metadata: {
          total: longTerm?.length || 0,
          used: relevant.length,
          averageConfidence: relevant.length > 0 
            ? relevant.reduce((sum, m) => sum + m.confidence, 0) / relevant.length 
            : 0
        }
      };
    },
    
    /**
     * compact: 记忆压缩时检测冲突
     */
    async compact(context) {
      const { messages, currentMemory, agentId } = context;
      
      if (!messages || messages.length === 0) {
        return { conflicts: 0 };
      }
      
      // 提取本轮对话中的新信息
      const newInsights = messages
        .filter(m => m.role === 'user')
        .map(m => ({ text: m.content, timestamp: new Date().toISOString() }));
      
      if (newInsights.length === 0) {
        return { conflicts: 0 };
      }
      
      // 检测冲突
      const conflicts = core.detectConflicts(newInsights, currentMemory || []);
      
      if (conflicts.length > 0) {
        // 写入冲突日志
        const conflictFile = await core.logConflicts(conflicts, agentId);
        
        // 如果有严重冲突，主动询问用户
        if (conflicts.some(c => c.severity === 'high')) {
          return { 
            needsUserReview: true,
            message: `检测到 ${conflicts.length} 处记忆冲突，请查看 ${conflictFile} 裁决`
          };
        }
        
        return { conflicts: conflicts.length, file: conflictFile };
      }
      
      return { conflicts: 0 };
    }
  },
  
  // ==================== Slash 命令 ====================
  commands: {
    /**
     * /resolve <conflictId> <decision>
     * 裁决冲突
     */
    async resolve(context, args) {
      const [conflictId, decision] = args;
      
      if (!conflictId || !decision) {
        return { 
          message: '用法: /resolve <冲突ID> <保留旧|保留新|合并>',
          error: true
        };
      }
      
      if (!['保留旧', '保留新', '合并'].includes(decision)) {
        return {
          message: '裁决结果必须是: 保留旧、保留新 或 合并',
          error: true
        };
      }
      
      const result = core.applyResolution(conflictId, decision);
      return { message: result.message };
    },
    
    /**
     * /conflicts - 列出所有待裁决冲突
     */
    async conflicts(context, args) {
      const { agentId } = context;
      const conflictFile = core.getConflictsPath(agentId);
      
      try {
        await fs.access(conflictFile);
        const content = await fs.readFile(conflictFile, 'utf8');
        
        // 提取待裁决部分
        const lines = content.split('\n');
        const pending = lines.filter(line => line.includes('待裁决')).slice(0, 10);
        
        if (pending.length === 0) {
          return { message: '✅ 暂无待裁决冲突' };
        }
        
        return { 
          message: `📋 待裁决冲突 (前${pending.length}条):\n\n${pending.join('\n')}\n\n使用 /resolve <冲突ID> <决策> 来裁决`
        };
      } catch (err) {
        return { message: '✅ 暂无待裁决冲突' };
      }
    },
    
    /**
     * /setup - 一键配置 life-validation 插件（新增）
     */
    async setup(context, args) {
      const steps = [];
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      
      try {
        steps.push('🔧 开始配置 life-validation...');
        
        // 1. 读取现有配置
        let config = {};
        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          config = JSON.parse(configContent);
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
        
        // 2. 配置 contextEngine（支持链式加载）
        if (config.contextEngine?.chain) {
          // 已有插件链
          if (!config.contextEngine.chain.includes('life-validation')) {
            config.contextEngine.chain.push('life-validation');
            steps.push('✅ 已将 life-validation 添加到插件链');
          } else {
            steps.push('ℹ️ life-validation 已在插件链中');
          }
        } else if (config.contextEngine?.plugin) {
          // 已有单个插件，转为链
          const existing = config.contextEngine.plugin;
          config.contextEngine = {
            chain: [existing, 'life-validation']
          };
          steps.push(`✅ 已将插件链配置为: ${existing} → life-validation`);
        } else {
          // 没有配置，直接设置
          config.contextEngine = {
            plugin: 'life-validation'
          };
          steps.push('✅ 已将 life-validation 设为默认插件');
        }
        
        // 3. 写回配置文件
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        steps.push('✅ 配置文件已更新');
        
        // 4. 重启 gateway
        steps.push('🔄 正在重启 gateway...');
        try {
          await execPromise('openclaw gateway restart');
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
        
        // 5. 返回成功消息
        return {
          message: `🎉 life-validation 配置完成！\n\n` +
                   steps.join('\n') +
                   `\n\n📝 现在你可以测试：\n` +
                   `/conflicts  # 查看待裁决冲突\n` +
                   `/resolve <冲突ID> <决策>  # 裁决冲突\n\n` +
                   `📖 查看冲突日志：\n` +
                   `ls ~/clawd/memory/CONFLICTS.md`
        };
        
      } catch (err) {
        return {
          message: `❌ 配置失败: ${err.message}\n\n` +
                   `请手动配置: 在 openclaw.json 中添加\n` +
                   `"contextEngine": { "plugin": "life-validation" }`,
          error: true
        };
      }
    },
    
    /**
     * /status - 查看插件状态（新增）
     */
    async status(context, args) {
      const { agentId } = context;
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      const conflictFile = core.getConflictsPath(agentId);
      
      try {
        // 1. 检查配置状态
        let configStatus = '❌ 未配置';
        let chainInfo = '';
        
        try {
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          if (config.contextEngine?.plugin === 'life-validation') {
            configStatus = '✅ 已配置为唯一插件';
          } else if (config.contextEngine?.chain?.includes('life-validation')) {
            configStatus = '✅ 已在插件链中';
            chainInfo = `插件链: ${config.contextEngine.chain.join(' → ')}`;
          } else {
            configStatus = '⚠️ 未启用（运行 /setup 配置）';
          }
        } catch {
          configStatus = '❌ 配置文件不存在';
        }
        
        // 2. 检查冲突日志
        let conflictStatus = '✅ 无待裁决冲突';
        let pendingCount = 0;
        
        try {
          await fs.access(conflictFile);
          const content = await fs.readFile(conflictFile, 'utf8');
          pendingCount = content.split('\n').filter(line => line.includes('待裁决')).length;
          
          if (pendingCount > 0) {
            conflictStatus = `⚠️ 有 ${pendingCount} 个待裁决冲突`;
          }
        } catch {
          conflictStatus = '✅ 无冲突日志';
        }
        
        // 3. 检查插件版本
        const pkgPath = path.join(__dirname, 'package.json');
        let version = 'unknown';
        try {
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
          version = pkg.version;
        } catch {}
        
        return {
          message: `📊 life-validation v${version} 状态\n\n` +
                   `🔧 配置状态: ${configStatus}\n` +
                   `${chainInfo ? chainInfo + '\n' : ''}` +
                   `⚖️ 冲突状态: ${conflictStatus}\n\n` +
                   `💡 首次使用请运行 /setup 一键配置\n` +
                   `📋 查看冲突请运行 /conflicts`
        };
        
      } catch (err) {
        return { message: `❌ 状态查询失败: ${err.message}` };
      }
    }
  }
};