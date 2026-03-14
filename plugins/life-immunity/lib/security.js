// lib/security.js - 安全核心功能
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SecurityManager {
  constructor() {
    this.dangerousPatterns = [
      // 文件系统危险操作
      { pattern: /rm -rf /i, level: 'critical', message: '递归删除操作非常危险' },
      { pattern: /rmdir \/s/i, level: 'critical', message: '强制删除目录' },
      { pattern: /del \/f \/s/i, level: 'critical', message: '强制删除所有文件' },
      { pattern: /format /i, level: 'critical', message: '格式化操作将清除所有数据' },
      { pattern: /chmod 777/i, level: 'high', message: '授予所有用户完全权限不安全' },
      { pattern: /sudo rm/i, level: 'critical', message: '使用 root 权限删除文件' },
      
      // 系统危险操作
      { pattern: /shutdown /i, level: 'high', message: '关机操作' },
      { pattern: /reboot /i, level: 'high', message: '重启操作' },
      { pattern: /init 0/i, level: 'critical', message: '系统关机' },
      { pattern: /poweroff/i, level: 'critical', message: '系统关机' },
      
      // 网络危险操作
      { pattern: /iptables -F/i, level: 'high', message: '清空防火墙规则' },
      { pattern: /ufw disable/i, level: 'high', message: '关闭防火墙' },
      
      // 数据危险操作
      { pattern: /dd if=\/dev\/zero/i, level: 'critical', message: '磁盘覆写操作' },
      { pattern: /mkfs/i, level: 'critical', message: '创建文件系统会格式化磁盘' }
    ];
  }

  /**
   * 检查命令是否危险
   */
  checkCommand(command) {
    for (const item of this.dangerousPatterns) {
      if (item.pattern.test(command)) {
        return {
          dangerous: true,
          level: item.level,
          message: item.message,
          command: command
        };
      }
    }
    return { dangerous: false };
  }

  /**
   * 收紧文件权限
   */
  async tightenPermissions() {
    const results = [];
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.openclaw');
    
    try {
      // 确保目录存在
      await fs.mkdir(configDir, { recursive: true });
      
      // 收紧配置目录权限
      if (process.platform !== 'win32') {
        // Linux/macOS
        await execPromise(`chmod 700 "${configDir}"`);
        results.push('✅ 配置目录权限收紧: 700');
        
        const configFile = path.join(configDir, 'openclaw.json');
        const fileExists = await fs.access(configFile).then(() => true).catch(() => false);
        if (fileExists) {
          await execPromise(`chmod 600 "${configFile}"`);
          results.push('✅ 配置文件权限收紧: 600');
        }
      } else {
        // Windows
        const username = process.env.USERNAME;
        await execPromise(`icacls "${configDir}" /inheritance:r /grant:r "${username}:(OI)(CI)F" /T`);
        results.push(`✅ Windows权限收紧: 仅允许 ${username} 访问`);
      }
      
      return { success: true, results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 检查当前权限状态
   */
  async checkPermissions() {
    const issues = [];
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configDir = path.join(homeDir, '.openclaw');
    
    try {
      const dirExists = await fs.access(configDir).then(() => true).catch(() => false);
      if (!dirExists) {
        return [{ type: 'info', message: '配置目录不存在，将自动创建' }];
      }
      
      if (process.platform !== 'win32') {
        const stat = await fs.stat(configDir);
        const mode = stat.mode & 0o777;
        
        if (mode !== 0o700) {
          issues.push({
            type: 'warn',
            file: configDir,
            current: mode.toString(8),
            expected: '700',
            message: '配置目录权限应为 700，防止其他用户读取'
          });
        }
        
        const configFile = path.join(configDir, 'openclaw.json');
        const fileStat = await fs.stat(configFile).catch(() => null);
        if (fileStat) {
          const fileMode = fileStat.mode & 0o777;
          if (fileMode !== 0o600) {
            issues.push({
              type: 'warn',
              file: configFile,
              current: fileMode.toString(8),
              expected: '600',
              message: '配置文件权限应为 600，防止泄露令牌'
            });
          }
        }
      }
    } catch (err) {
      issues.push({ type: 'error', message: `权限检查失败: ${err.message}` });
    }
    
    return issues;
  }
}

module.exports = SecurityManager;