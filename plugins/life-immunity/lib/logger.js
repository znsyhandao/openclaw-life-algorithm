// lib/logger.js - 简单日志模块
const fs = require('fs').promises;
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLevel = LOG_LEVELS.INFO;

function setLevel(level) {
  currentLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
}

async function log(level, message, data = null) {
  if (LOG_LEVELS[level] < currentLevel) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  console.log(logMessage);
  
  // 写入文件（可选）
  try {
    const logDir = path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, `immunity-${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(logFile, logMessage + '\n');
  } catch (err) {
    // 忽略文件写入错误
  }
}

module.exports = {
  debug: (msg, data) => log('DEBUG', msg, data),
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  setLevel
};