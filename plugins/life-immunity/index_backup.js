const core = require('./lib/immunity-core');
const fs = require('fs').promises;
const path = require('path');

/**
 * life-immunity 插件
 * 
 * 免疫系统插件 - 安全审计、权限控制、沙箱隔离
 */

module.exports = {
  name: 'life-immunity',
  version: '1.0.0',
  description: '免疫系统插件 - 给AI穿上钢铁盔甲',
  
  hooks: {
    /**
     * bootstrap: 启动时自动运行安全审计
     */
    async bootstrap(context) {
      const { agentId } = context;
      const issues = [];
      
      // 1. 检查权限
      const permIssues = await core.checkPermissions();
      issues.push(...permIssues);
      
      // 2. 运行快速安全审计（非深度，不修复）
      const auditResult = await core.runSecurityAudit(false, false);
      if (auditResult.issues.length > 0) {
        issues.push(...auditResult.issues.map(msg => ({ type: 'warn', message: msg })));
      }
      
      if (issues.length > 0) {
        console.warn(`🛡️ [life-immunity] 发现 ${issues.length} 个安全问题:`);
        issues.forEach(issue => {
          const icon = issue.type === 'critical' ? '🔴' : issue.type === 'warn' ? '⚠️' : 'ℹ️';
          console.warn(`  ${icon} ${issue.message}`);
        });
        
        // 记录到文件
        const logDir = path.join(core.getConfigDir(), 'immunity-logs');
        await fs.mkdir(logDir, { recursive: true });
        const logFile = path.join(logDir, `bootstrap-${new Date().toISOString().split('T')[0]}.log`);
        await fs.appendFile(logFile, JSON.stringify({
          timestamp: new Date().toISOString(),
          agentId,
          issues
        }, null, 2) + '\n');
        
        return { securityIssues: issues };
      }
      
      return { secure: true };
    },
    
    /**
     * assemble: 动态拦截高危操作
     */
    async assemble(context) {
      const { userInput } = context;
      
      if (!userInput) return {};
      
      // 检查是否包含高危命令
      const dangerCheck = core.checkDangerousCommand(userInput);
      
      if (dangerCheck.dangerous) {
        // 记录高危操作
        const logDir = path.join(core.getConfigDir(), 'immunity-logs');
        await fs.mkdir(logDir, { recursive: true });
        const logFile = path.join(logDir, 'dangerous-commands.log');
        await fs.appendFile(logFile, JSON.stringify({
          timestamp: new Date().toISOString(),
          command: userInput,
          level: dangerCheck.level,
          message: dangerCheck.message,
          session: context.sessionId
        }) + '\n');
        
        // 返回警告信息，要求用户确认
        return {
          securityBlock: true,
          warning: `⚠️ 高危操作警告：${dangerCheck.message}\n命令: ${userInput}\n\n如需执行，请再次输入相同的命令确认。`,
          requireConfirmation: true,
          originalInput: userInput,
          dangerLevel: dangerCheck.level
        };
      }
      
      return {};
    }
  },
  
  commands: {
    /**
     * /audit - 运行安全审计
     */
    async audit(context, args) {
      const deep = args.includes('--deep');
      const fix = args.includes('--fix');
      
      const result = await core.runSecurityAudit(deep, fix);
      
      if (!result.success) {
        return { 
          message: `❌ 审计失败: ${result.output}`,
          error: true
        };
      }
      
      let response = `🛡️ 安全审计结果 (${deep ? '深度' : '快速'}模式):\n\n`;
      
      if (result.issues.length === 0) {
        response += '✅ 未发现安全问题，你的系统很安全！\n';
      } else {
        response += `⚠️ 发现 ${result.issues.length} 个问题:\n`;
        result.issues.forEach((issue, i) => {
          response += `${i+1}. ${issue}\n`;
        });
        response += '\n使用 `/audit --fix` 尝试自动修复部分问题。';
      }
      
      return { message: response };
    },
    
    /**
     * /harden - 一键加固
     */
    async harden(context, args) {
      const steps = [];
      
      // 1. 修复权限
      steps.push('🔒 正在收紧权限...');
      const permResult = await core.fixPermissions();
      if (permResult.success) {
        steps.push(...permResult.results);
      } else {
        steps.push(`❌ 权限修复失败: ${permResult.error}`);
      }
      
      // 2. 运行安全审计修复
      steps.push('\n🔍 运行安全审计修复...');
      const auditResult = await core.runSecurityAudit(false, true);
      if (auditResult.success) {
        steps.push('✅ 安全审计修复完成');
        if (auditResult.issues.length > 0) {
          steps.push(`⚠️ 仍有 ${auditResult.issues.length} 个问题需要手动处理`);
        }
      } else {
        steps.push(`❌ 审计修复失败: ${auditResult.output}`);
      }
      
      // 3. 生成沙箱配置建议
      steps.push('\n📦 沙箱配置建议:');
      const sandbox = core.generateSandboxConfig();
      steps.push('在 openclaw.json 中添加：');
      steps.push(JSON.stringify(sandbox, null, 2));
      
      return { message: steps.join('\n') };
    },
    
    /**
     * /sandbox - 生成沙箱配置
     */
    async sandbox(context, args) {
      const sandbox = core.generateSandboxConfig();
      
      let response = '📦 Docker 沙箱配置建议:\n\n';
      response += '将以下配置添加到 `~/.openclaw/openclaw.json` 的 `agents.defaults` 部分：\n\n';
      response += '```json\n';
      response += JSON.stringify(sandbox, null, 2);
      response += '\n```\n\n';
      response += '配置说明：\n';
      response += '- 内存限制: 2G\n';
      response += '- CPU限制: 1核\n';
      response += '- 只读路径: /etc, /usr, /bin\n';
      response += '- 网络白名单: OpenAI, Anthropic, DeepSeek API\n';
      
      return { message: response };
    },
    
    /**
     * /immunity-status - 查看免疫系统状态
     */
    async status(context, args) {
      const issues = await core.checkPermissions();
      
      let response = '🛡️ 免疫系统状态:\n\n';
      
      if (issues.length === 0) {
        response += '✅ 权限检查通过\n';
      } else {
        response += `⚠️ 发现 ${issues.length} 个权限问题:\n`;
        issues.forEach(issue => {
          response += `- ${issue.message}\n`;
        });
      }
      
      // 查看日志目录
      const logDir = path.join(core.getConfigDir(), 'immunity-logs');
      try {
        const files = await fs.readdir(logDir);
        response += `\n📋 免疫系统日志: ${files.length} 个文件`;
      } catch {
        response += `\n📋 免疫系统日志: 无`;
      }
      
      return { message: response };
    }
  }
};