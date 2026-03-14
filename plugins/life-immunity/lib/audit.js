// lib/audit.js - 安全审计功能
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class SecurityAuditor {
  /**
   * 运行安全审计
   */
  async runAudit(deep = false, fix = false) {
    try {
      let cmd = 'openclaw security audit';
      if (deep) cmd += ' --deep';
      if (fix) cmd += ' --fix';
      
      const { stdout, stderr } = await execPromise(cmd);
      
      // 解析审计结果
      const issues = [];
      const lines = stdout.split('\n');
      lines.forEach(line => {
        if (line.includes('WARN') || line.includes('CRITICAL')) {
          issues.push(line.trim());
        }
      });
      
      return {
        success: true,
        output: stdout + (stderr || ''),
        issues: issues
      };
    } catch (err) {
      return {
        success: false,
        output: err.message,
        issues: []
      };
    }
  }

  /**
   * 检查与 life-validation 的联动
   */
  async checkValidationLink() {
    try {
      // 检查配置文件
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const configPath = path.join(homeDir, '.openclaw', 'openclaw.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      // 检查是否配置了 life-validation
      const hasValidation = config.contextEngine?.plugin === 'life-validation' ||
                           config.contextEngine?.chain?.includes('life-validation');
      
      // 检查冲突日志
      const conflictLog = path.join(homeDir, 'clawd', 'memory', 'CONFLICTS.md');
      const hasConflicts = await fs.access(conflictLog).then(() => true).catch(() => false);
      
      return {
        hasValidation,
        hasConflicts,
        message: hasValidation ? 
          '✅ life-validation 已集成' : 
          '⚠️ life-validation 未配置，建议安装以增强安全'
      };
    } catch (err) {
      return {
        hasValidation: false,
        hasConflicts: false,
        message: `❌ 检查失败: ${err.message}`
      };
    }
  }

  /**
   * 生成安全报告
   */
  async generateReport(auditResult, validationStatus, permissions) {
    const timestamp = new Date().toISOString();
    
    let report = `🛡️ 免疫系统安全报告\n`;
    report += `📅 时间: ${timestamp}\n\n`;
    
    // 权限状态
    report += `🔒 权限状态:\n`;
    if (permissions.length === 0) {
      report += `   ✅ 权限配置正确\n`;
    } else {
      permissions.forEach(p => {
        report += `   ⚠️ ${p.message}\n`;
      });
    }
    
    // 审计结果
    report += `\n🔍 安全审计:\n`;
    if (auditResult.issues.length === 0) {
      report += `   ✅ 未发现安全问题\n`;
    } else {
      report += `   ⚠️ 发现 ${auditResult.issues.length} 个问题:\n`;
      auditResult.issues.slice(0, 5).forEach(issue => {
        report += `      - ${issue}\n`;
      });
      if (auditResult.issues.length > 5) {
        report += `      ... 还有 ${auditResult.issues.length - 5} 个问题\n`;
      }
    }
    
    // 联动状态
    report += `\n🤝 与 life-validation 联动:\n`;
    report += `   ${validationStatus.message}\n`;
    
    return report;
  }
}

module.exports = SecurityAuditor;