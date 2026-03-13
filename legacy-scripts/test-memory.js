const fs = require('fs');
const path = require('path');

// 确保目录存在
const memoryDir = path.join(process.env.HOME, 'clawd', 'memory');
fs.mkdirSync(memoryDir, { recursive: true });

// 手动写入测试数据
const today = new Date().toISOString().split('T')[0];
const logFile = path.join(memoryDir, today + '.md');
const lifeFile = path.join(memoryDir, 'LIFE.md');

// 写入今日日志
const timestamp = new Date().toISOString();
const logEntry = `\n## ${timestamp}\n- 用户名字是 憨道\n`;
fs.appendFileSync(logFile, logEntry);

// 写入生命记忆
const lifeEntry = `\n## 记忆更新 (${today})\n- 用户名字是 憨道\n`;
fs.appendFileSync(lifeFile, lifeEntry);

console.log('✅ 测试数据写入成功');
console.log('记忆目录:', memoryDir);
console.log('文件列表:', fs.readdirSync(memoryDir));
