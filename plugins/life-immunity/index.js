// index.js - life-immunity 主文件
const SecurityManager = require('./lib/security');
const SecurityAuditor = require('./lib/audit');

const security = new SecurityManager();
const auditor = new SecurityAuditor();

module.exports = {
  name: 'life-immunity',
  version: '1.2.0',
  description: '免疫系统插件 - 高危拦截、权限控制、安全审计',
  
  hooks: {
    /**
     * assemble: 在用户输入时检查高危操作
     */
    async assemble(context) {
      const { userInput } = context;
      
      if (!userInput) return {};
      
      // 检查是否包含高危命令
      const dangerCheck = security.checkCommand(userInput);
      
      if (dangerCheck.dangerous) {
        return {
          securityBlock: true,
          warning: `⚠️ 高危操作拦截！\n` +
                   `检测到: ${dangerCheck.message}\n` +
                   `命令: ${dangerCheck.command}\n\n` +
                   `如需执行，请再次输入相同的命令确认。`,
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
     * /immunity-setup - 一键配置
     */
    async 'immunity-setup'(context, args) {
      const steps = [];
      
      // 1. 收紧权限
      steps.push('🔒 正在收紧权限...');
      const permResult = await security.tightenPermissions();
      if (permResult.success) {
        steps.push(...permResult.results);
      } else {
        steps.push(`❌ 权限收紧失败: ${permResult.error}`);
      }
      
      // 2. 检查配置
      steps.push('\n📋 检查配置...');
      const validationStatus = await auditor.checkValidationLink();
      steps.push(validationStatus.message);
      
      return {
        message: `🛡️ life-immunity 配置完成！\n\n${steps.join('\n')}`
      };
    },
    
    /**
     * /immunity-status - 查看状态
     */
    async 'immunity-status'(context, args) {
      // 1. 检查权限
      const permissions = await security.checkPermissions();
      
      // 2. 运行快速审计
      const auditResult = await auditor.runAudit(false, false);
      
      // 3. 检查联动
      const validationStatus = await auditor.checkValidationLink();
      
      // 4. 生成报告
      const report = await auditor.generateReport(
        auditResult, 
        validationStatus, 
        permissions
      );
      
      return { message: report };
    },
    
    /**
     * /immunity-audit - 运行安全审计
     */
    async 'immunity-audit'(context, args) {
      const deep = args.includes('--deep');
      const fix = args.includes('--fix');
      
      const result = await auditor.runAudit(deep, fix);
      
      if (!result.success) {
        return { message: `❌ 审计失败: ${result.output}` };
      }
      
      let response = `🔍 安全审计结果 (${deep ? '深度' : '快速'}模式):\n\n`;
      
      if (result.issues.length === 0) {
        response += '✅ 未发现安全问题，你的系统很安全！\n';
      } else {
        response += `⚠️ 发现 ${result.issues.length} 个问题:\n`;
        result.issues.slice(0, 10).forEach((issue, i) => {
          response += `${i+1}. ${issue}\n`;
        });
        if (result.issues.length > 10) {
          response += `... 还有 ${result.issues.length - 10} 个问题\n`;
        }
        response += '\n使用 `/immunity-audit --fix` 尝试自动修复。';
      }
      
      return { message: response };
    },
    
    /**
     * /immunity-harden - 一键加固
     */
    async 'immunity-harden'(context, args) {
      const steps = [];
      
      // 1. 收紧权限
      steps.push('🔒 收紧权限...');
      const permResult = await security.tightenPermissions();
      if (permResult.success) {
        steps.push(...permResult.results);
      } else {
        steps.push(`❌ 权限收紧失败: ${permResult.error}`);
      }
      
      // 2. 运行安全审计修复
      steps.push('\n🔧 运行安全审计修复...');
      const auditResult = await auditor.runAudit(false, true);
      if (auditResult.success) {
        steps.push('✅ 安全审计修复完成');
        if (auditResult.issues.length > 0) {
          steps.push(`⚠️ 仍有 ${auditResult.issues.length} 个问题需要手动处理`);
        }
      } else {
        steps.push(`❌ 审计修复失败: ${auditResult.output}`);
      }
      
      return { message: steps.join('\n') };
    },
    
    /**
     * /immunity-check <命令> - 检查指定命令是否危险
     */
    async 'immunity-check'(context, args) {
      const command = args.join(' ');
      
      if (!command) {
        return { message: '用法: /immunity-check <要检查的命令>' };
      }
      
      const result = security.checkCommand(command);
      
      if (result.dangerous) {
        return {
          message: `⚠️ 危险命令检测!\n` +
                   `等级: ${result.level}\n` +
                   `风险: ${result.message}\n` +
                   `命令: ${result.command}`
        };
      } else {
        return { message: `✅ 命令看起来安全: ${command}` };
      }
    }
  }
};