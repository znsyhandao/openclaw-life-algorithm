// lib/immunity-core.js - 免疫系统核心逻辑
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * 免疫系统核心模块 - 安全审计、权限控制、沙箱配置
 */

// 检查是否为 Windows
const isWindows = process.platform === 'win32';

/**
 * 获取 OpenClaw 配置目录
 */
function getConfigDir() {
  return path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw');
}

/**
 * 运行安全审计
 * @param {boolean} deep - 是否深度审计
 * @param {boolean} fix - 是否自动修复
 * @returns {Promise<{success: boolean, output: string, issues: Array}>}
 */
async function runSecurityAudit(deep = false, fix = false) {
  try {
    let cmd = 'openclaw security audit';
    if (deep) cmd += ' --deep';
    if (fix) cmd += ' --fix';
    
    const { stdout, stderr } = await execPromise(cmd);
    
    // 解析审计结果，提取问题列表
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
      issues: [],
      error: err
    };
  }
}

/**
 * 检查目录权限
 * @returns {Promise<Array>} 权限问题列表
 */
async function checkPermissions() {
  const issues = [];
  const configDir = getConfigDir();
  
  try {
    // 检查配置目录是否存在
    const dirExists = await fs.access(configDir).then(() => true).catch(() => false);
    if (!dirExists) {
      return [{ type: 'info', message: '配置目录不存在，将自动创建' }];
    }
    
    // 检查目录权限 (Windows 和 Linux 不同)
    if (!isWindows) {
      // Linux/macOS 权限检查
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
      
      // 检查配置文件权限
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
    } else {
      // Windows 权限检查（简化版）
      issues.push({
        type: 'info',
        message: 'Windows 系统请手动检查目录权限：确保只有你的用户可访问'
      });
    }
  } catch (err) {
    issues.push({
      type: 'error',
      message: `权限检查失败: ${err.message}`
    });
  }
  
  return issues;
}

/**
 * 修复权限问题
 * @returns {Promise<{success: boolean, results: Array}>}
 */
async function fixPermissions() {
  const results = [];
  const configDir = getConfigDir();
  
  try {
    // 确保配置目录存在
    await fs.mkdir(configDir, { recursive: true });
    
    if (!isWindows) {
      // Linux/macOS 修复权限
      await execPromise(`chmod 700 "${configDir}"`);
      results.push(`✅ 设置目录权限 700: ${configDir}`);
      
      const configFile = path.join(configDir, 'openclaw.json');
      const fileExists = await fs.access(configFile).then(() => true).catch(() => false);
      if (fileExists) {
        await execPromise(`chmod 600 "${configFile}"`);
        results.push(`✅ 设置配置文件权限 600: ${configFile}`);
      }
    } else {
      // Windows 修复权限（icacls）
      const username = process.env.USERNAME;
      await execPromise(`icacls "${configDir}" /inheritance:r /grant:r "${username}:(OI)(CI)F" /T`);
      results.push(`✅ 设置目录权限，仅允许 ${username} 完全控制`);
    }
    
    return { success: true, results };
  } catch (err) {
    return {
      success: false,
      results,
      error: err.message
    };
  }
}

/**
 * 检查高危操作
 * @param {string} command - 用户输入的命令
 * @returns {Object} 检查结果
 */
function checkDangerousCommand(command) {
  const dangerousPatterns = [
    { pattern: /rm -rf /, level: 'critical', message: '递归删除操作非常危险' },
    { pattern: /format /, level: 'critical', message: '格式化操作将清除数据' },
    { pattern: /del \/f \/s/, level: 'critical', message: '强制删除所有文件' },
    { pattern: /shutdown /, level: 'high', message: '关机操作' },
    { pattern: /reboot /, level: 'high', message: '重启操作' },
    { pattern: /chmod 777/, level: 'high', message: '授予所有用户完全权限不安全' },
    { pattern: /sudo rm/, level: 'critical', message: '使用 root 权限删除文件' }
  ];
  
  for (const item of dangerousPatterns) {
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
 * 生成 Docker 沙箱配置
 * @returns {Object} 沙箱配置
 */
function generateSandboxConfig() {
  return {
    sandbox: {
      mode: "all",
      docker: {
        memory: "2g",
        cpus: "1",
        user: "1000:1000",
        readOnlyPaths: ["/etc", "/usr", "/bin"],
        networkPolicy: "allowlist",
        allowedDomains: ["api.openai.com", "api.anthropic.com", "api.deepseek.com"]
      }
    }
  };
}

module.exports = {
  runSecurityAudit,
  checkPermissions,
  fixPermissions,
  checkDangerousCommand,
  generateSandboxConfig,
  getConfigDir,
  isWindows
};