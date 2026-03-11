const fs = require('fs');
const path = require('path');

/**
 * 记忆核心模块 - 处理所有记忆读写操作
 */

// 获取记忆目录路径
function getMemoryDir(agentId = 'default') {
  // agentId 可以用来区分不同AI的记忆
  return path.join(process.env.HOME, 'clawd', 'memory', agentId);
}

// 确保目录存在
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 获取今日日志文件路径
function getTodayLogFile(agentId) {
  const dir = ensureDir(getMemoryDir(agentId));
  const today = new Date().toISOString().split('T')[0];
  return path.join(dir, today + '.md');
}

// 获取长期记忆文件路径
function getLifeFile(agentId) {
  const dir = ensureDir(getMemoryDir(agentId));
  return path.join(dir, 'LIFE.md');
}

// 写入今日日志
function appendToTodayLog(agentId, content) {
  const file = getTodayLogFile(agentId);
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n${content}`;
  fs.appendFileSync(file, entry);
  return { file, entry };
}

// 写入长期记忆
function appendToLife(agentId, content) {
  const file = getLifeFile(agentId);
  const today = new Date().toISOString().split('T')[0];
  const entry = `\n## 记忆更新 (${today})\n${content}`;
  fs.appendFileSync(file, entry);
  return { file, entry };
}

// 读取长期记忆
function readLife(agentId) {
  const file = getLifeFile(agentId);
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf8');
  }
  return '';
}

// 从对话中提取值得记住的信息
function extractInsights(messages) {
  const insights = [];
  
  // 简单的提取规则
  messages.forEach(msg => {
    if (msg.role === 'user') {
      const text = msg.content;
      
      // 规则1: 用户明确说"记住"
      if (text.includes('记住') || text.includes('我叫') || text.includes('我是')) {
        insights.push(`- 用户说: ${text}`);
      }
      
      // 规则2: 偏好表达
      if (text.includes('我喜欢') || text.includes('我偏好')) {
        insights.push(`- 用户偏好: ${text}`);
      }
      
      // 规则3: 重要信息（包含密钥、账号等关键词）
      if (text.includes('密钥') || text.includes('密码') || text.includes('账号')) {
        insights.push(`- ⚠️ 重要信息: ${text}`);
      }
    }
  });
  
  return insights;
}

// 检测记忆冲突
function detectConflicts(newInsights, existingMemory) {
  const conflicts = [];
  
  newInsights.forEach(insight => {
    // 简单的冲突检测：如果旧记忆里有相反的表述
    if (insight.includes('不喜欢') && existingMemory.includes('喜欢')) {
      conflicts.push({
        type: 'preference_change',
        insight,
        severity: 'medium'
      });
    }
    
    // 可以添加更多规则...
  });
  
  return conflicts;
}

module.exports = {
  getMemoryDir,
  ensureDir,
  getTodayLogFile,
  getLifeFile,
  appendToTodayLog,
  appendToLife,
  readLife,
  extractInsights,
  detectConflicts
};
