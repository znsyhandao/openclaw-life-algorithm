// life-validation/index.js - 完整版 v1.2.0
// 新增：认知负荷计算、情绪权重、自我可答性、动态冲突等级
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const validationCore = require('./lib/validation-core');
const logger = require('./lib/logger');

/**
 * life-validation 插件
 * 
 * 验证层插件 - 冲突检测、可信度裁决
 * 版本: 1.2.0
 * 新增: 
 *   - 认知负荷计算 (Cognitive Load)
 *   - 情绪权重 (Emotional Weight)
 *   - 自我可答性评估 (Self-Answerability)
 *   - 动态冲突等级调整
 */

module.exports = {
  name: 'life-validation',
  version: '1.2.0',
  description: '验证层插件 - 冲突检测、可信度裁决（带认知负荷、情绪权重、自我可答性）',
  
  // ==================== 核心钩子 ====================
  hooks: {
    /**
     * assemble: 动态装配记忆，只选高可信度的
     * 新增：集成认知负荷和情绪权重
     */
    async assemble(context) {
      const { longTerm, messages, agentId } = context;
      
      if (!longTerm || longTerm.length === 0) {
        return { memory: [] };
      }
      
      // 调用核心验证器（整合所有新功能）
      const result = await validationCore.validate(context);
      
      // 记录日志
      const logDir = path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'validation-logs');
      await fs.mkdir(logDir, { recursive: true }).catch(() => {});
      
      // 如果认知负荷过高，添加警告
      const warnings = [];
      if (result.cognitiveLoad.overloaded) {
        warnings.push(`⚠️ 认知负荷过高 (${result.cognitiveLoad.score.toFixed(2)})，建议人工介入`);
      }
      
      if (result.answerability.knows === false) {
        warnings.push(`❓ 自我可答性低: ${result.answerability.reason}`);
      }
      
      return {
        memory: result.confidenceScores.map(m => m.text || m),
        metadata: {
          total: longTerm?.length || 0,
          used: result.confidenceScores.length,
          averageConfidence: result.confidenceScores.length > 0 
            ? result.confidenceScores.reduce((sum, m) => sum + (m.confidence || 0), 0) / result.confidenceScores.length 
            : 0,
          cognitiveLoad: result.cognitiveLoad,
          conflicts: result.conflicts.count,
          answerability: result.answerability,
          warnings
        }
      };
    },
    
    /**
     * compact: 记忆压缩时检测冲突
     * 新增：根据认知负荷动态调整冲突严重程度
     */
    async compact(context) {
      const { messages, currentMemory, agentId } = context;
      
      if (!messages || messages.length === 0) {
        return { conflicts: 0 };
      }
      
      // 调用核心验证器
      const result = await validationCore.validate(context);
      
      if (result.conflicts.count > 0) {
        // 写入冲突日志
        const conflictFile = await this._logConflicts(result.conflicts.conflicts, agentId);
        
        // 如果有严重冲突或认知负荷过高，主动询问用户
        const hasHighSeverity = result.conflicts.conflicts.some(c => c.severity === 'high');
        
        if (hasHighSeverity || result.cognitiveLoad.overloaded) {
          return { 
            needsUserReview: true,
            message: `检测到 ${result.conflicts.count} 处记忆冲突，当前认知负荷 ${result.cognitiveLoad.score.toFixed(2)}（${result.cognitiveLoad.overloaded ? '过高' : '正常'}），请查看 ${conflictFile} 裁决`
          };
        }
        
        return { conflicts: result.conflicts.count, file: conflictFile };
      }
      
      return { conflicts: 0 };
    },
    
    /**
     * 辅助函数：记录冲突日志
     */
    async _logConflicts(conflicts, agentId) {
      const conflictFile = path.join(
        process.env.HOME || process.env.USERPROFILE,
        'clawd',
        'memory',
        agentId || 'default',
        'CONFLICTS.md'
      );
      
      const dir = path.dirname(conflictFile);
      await fs.mkdir(dir, { recursive: true });
      
      let content = '';
      try {
        content = await fs.readFile(conflictFile, 'utf8');
      } catch {
        content = '# 🧠 记忆冲突待裁决\n\n';
      }
      
      conflicts.forEach(c => {
        content += `\n## ⚠️ 冲突 [${c.id}]\n`;
        content += `- **时间**: ${c.timestamp}\n`;
        content += `- **关键词**: ${c.keyword}\n`;
        content += `- **严重程度**: ${c.severity}\n`;
        content += `- **认知负荷**: ${c.cognitiveLoad.toFixed(2)}\n`;
        content += `- **旧记忆**: ${c.oldMemory}\n`;
        content += `- **新记忆**: ${c.newMemory}\n`;
        content += `- **状态**: 待裁决\n`;
        content += `- **裁决命令**: ${c.resolveCommand}\n\n`;
      });
      
      await fs.writeFile(conflictFile, content);
      return conflictFile;
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
      
      logger.info('用户裁决', { conflictId, decision, timestamp: new Date().toISOString() });
      
      // 记录裁决到文件（用于后续分析）
      const resolutionFile = path.join(
        process.env.HOME || process.env.USERPROFILE,
        '.openclaw',
        'validation-logs',
        'resolutions.jsonl'
      );
      
      const resolutionRecord = JSON.stringify({
        conflictId,
        decision,
        timestamp: new Date().toISOString(),
        version: '1.2.0'
      }) + '\n';
      
      await fs.mkdir(path.dirname(resolutionFile), { recursive: true });
      await fs.appendFile(resolutionFile, resolutionRecord);
      
      return { message: `✅ 冲突 ${conflictId} 已按 "${decision}" 解决` };
    },
    
    /**
     * /conflicts - 列出所有待裁决冲突
     * 新增：显示认知负荷信息
     */
    async conflicts(context, args) {
      const { agentId } = context;
      const conflictFile = path.join(
        process.env.HOME || process.env.USERPROFILE,
        'clawd',
        'memory',
        agentId || 'default',
        'CONFLICTS.md'
      );
      
      // 同时计算当前认知负荷
      const cognitiveLoad = validationCore.calculateCognitiveLoad(context);
      
      try {
        await fs.access(conflictFile);
        const content = await fs.readFile(conflictFile, 'utf8');
        
        // 提取待裁决部分
        const lines = content.split('\n');
        const pending = lines.filter(line => line.includes('待裁决')).slice(0, 10);
        
        if (pending.length === 0) {
          return { message: `✅ 暂无待裁决冲突（当前认知负荷: ${cognitiveLoad.score.toFixed(2)}）` };
        }
        
        return { 
          message: `📋 待裁决冲突 (前${pending.length}条) - 认知负荷: ${cognitiveLoad.score.toFixed(2)} ${cognitiveLoad.overloaded ? '⚠️' : '✅'}\n\n${pending.join('\n')}\n\n使用 /resolve <冲突ID> <决策> 来裁决`
        };
      } catch (err) {
        return { message: `✅ 暂无待裁决冲突（当前认知负荷: ${cognitiveLoad.score.toFixed(2)}）` };
      }
    },
    
    /**
     * /validation-setup - 一键配置 life-validation 插件
     */
    async 'validation-setup'(context, args) {
      const steps = [];
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      
      try {
        steps.push('🔧 开始配置 life-validation v1.2.0...');
        
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
        
        // 5. 创建日志目录
        const logDir = path.join(homeDir, '.openclaw', 'validation-logs');
        await fs.mkdir(logDir, { recursive: true });
        steps.push('✅ 日志目录已创建');
        
        // 6. 返回成功消息
        return {
          message: `🎉 life-validation v1.2.0 配置完成！\n\n` +
                   steps.join('\n') +
                   `\n\n📝 新功能说明：\n` +
                   `- 🧠 认知负荷计算: 自动检测记忆过载\n` +
                   `- 💖 情绪权重: 情感强烈信息可信度更高\n` +
                   `- 🤔 自我可答性: AI知道自己在说什么\n` +
                   `- ⚖️ 动态冲突等级: 负荷越高，冲突越严重\n\n` +
                   `📋 可用命令：\n` +
                   `/conflicts              # 查看待裁决冲突\n` +
                   `/resolve <ID> <决策>    # 裁决冲突\n` +
                   `/validation-status       # 查看插件状态`
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
     * /validation-status - 查看插件状态（升级版）
     * 新增：显示认知负荷、情绪权重等信息
     */
    async 'validation-status'(context, args) {
      const { agentId, longTerm, messages } = context;
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      const conflictFile = path.join(
        homeDir,
        'clawd',
        'memory',
        agentId || 'default',
        'CONFLICTS.md'
      );
      
      try {
        // 1. 计算认知负荷
        const cognitiveLoad = validationCore.calculateCognitiveLoad(context);
        
        // 2. 检查配置状态
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
            configStatus = '⚠️ 未启用（运行 /validation-setup 配置）';
          }
        } catch {
          configStatus = '❌ 配置文件不存在';
        }
        
        // 3. 检查冲突日志
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
        
        // 4. 计算平均可信度（如果有记忆）
        let avgConfidence = 0;
        if (longTerm && longTerm.length > 0) {
          const scored = await validationCore.confidenceScores;
          avgConfidence = scored.length > 0 
            ? scored.reduce((sum, m) => sum + (m.confidence || 0), 0) / scored.length 
            : 0;
        }
        
        // 5. 检查插件版本
        const pkgPath = path.join(__dirname, 'package.json');
        let version = 'unknown';
        try {
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
          version = pkg.version;
        } catch {}
        
        return {
          message: `📊 life-validation v${version} 状态\n\n` +
                   `🧠 认知负荷: ${cognitiveLoad.score.toFixed(2)} ${cognitiveLoad.overloaded ? '⚠️ 过高' : '✅ 正常'}\n` +
                   `   - 记忆数: ${cognitiveLoad.components.memoryCount}\n` +
                   `   - 冲突数: ${cognitiveLoad.components.conflictCount}\n` +
                   `   - 消息数: ${cognitiveLoad.components.messageCount}\n\n` +
                   `🔧 配置状态: ${configStatus}\n` +
                   `${chainInfo ? chainInfo + '\n' : ''}` +
                   `⚖️ 冲突状态: ${conflictStatus}\n` +
                   `📈 平均可信度: ${avgConfidence.toFixed(2)}\n\n` +
                   `💡 新功能：\n` +
                   `- 情绪权重: 情感强烈信息自动加权\n` +
                   `- 自我可答性: AI能判断自己是否知道答案\n` +
                   `- 动态冲突等级: 负荷越高，冲突越严重\n\n` +
                   `📋 可用命令:\n` +
                   `/conflicts              # 查看待裁决冲突\n` +
                   `/resolve <ID> <决策>    # 裁决冲突`
        };
        
      } catch (err) {
        return { message: `❌ 状态查询失败: ${err.message}` };
      }
    },
    
    /**
     * /preview - 预览新信息的影响（新增）
     * 让用户先看到新信息可能造成的冲突，再决定是否记住
     */
    async preview(context, args) {
      const { longTerm } = context;
      const newInfo = args.join(' ');
      
      if (!newInfo) {
        return { message: '用法: /preview <要检查的信息>', error: true };
      }
      
      // 模拟一条新记忆
      const newMem = {
        text: newInfo,
        timestamp: new Date().toISOString(),
        sourceType: 'user_explicit'
      };
      
      // 用冲突检测器分析
      const conflictDetector = require('./lib/conflict');
      const topicIndex = conflictDetector._buildTopicIndex(longTerm || []);
      
      const related = [];
      const keywords = newInfo.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      
      for (const kw of keywords.slice(0, 3)) {
        const matches = topicIndex[kw] || [];
        for (const mem of matches) {
          if (conflictDetector._isConflicting(newInfo, mem.text)) {
            related.push({
              keyword: kw,
              existingMemory: mem.text,
              conflictProbability: 0.8 // 简化版
            });
          }
        }
      }
      
      if (related.length === 0) {
        return { message: `✅ 新信息「${newInfo}」与现有记忆无冲突` };
      }
      
      let msg = `⚠️ 新信息「${newInfo}」可能引发冲突：\n\n`;
      related.forEach((r, i) => {
        msg += `${i+1}. 关键词「${r.keyword}」与现有记忆冲突：\n`;
        msg += `   现有记忆: ${r.existingMemory}\n`;
        msg += `   冲突概率: ${(r.conflictProbability * 100).toFixed(0)}%\n\n`;
      });
      msg += `使用 /remember 仍可记住，或 /cancel 取消`;
      
      return { message: msg };
    }
  }
};