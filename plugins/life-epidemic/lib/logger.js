// life-epidemic/lib/logger.js
// 简单日志模块

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLevel = LOG_LEVELS.INFO;

/**
 * 设置日志级别
 */
function setLevel(level) {
  currentLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
}

/**
 * 格式化日志消息
 */
function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  let logMsg = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    if (typeof data === 'object') {
      try {
        logMsg += ' ' + JSON.stringify(data);
      } catch (err) {
        logMsg += ' [无法序列化的数据]';
      }
    } else {
      logMsg += ' ' + data;
    }
  }
  
  return logMsg;
}

/**
 * 记录日志（内部方法）
 */
function log(level, message, data) {
  if (LOG_LEVELS[level] < currentLevel) return;
  
  const logMsg = formatMessage(level, message, data);
  
  // 根据级别选择输出方式
  switch (level) {
    case 'ERROR':
      console.error(logMsg);
      break;
    case 'WARN':
      console.warn(logMsg);
      break;
    case 'INFO':
      console.info(logMsg);
      break;
    case 'DEBUG':
      console.debug(logMsg);
      break;
    default:
      console.log(logMsg);
  }
}

/**
 * 调试日志
 */
function debug(message, data) {
  log('DEBUG', message, data);
}

/**
 * 信息日志
 */
function info(message, data) {
  log('INFO', message, data);
}

/**
 * 警告日志
 */
function warn(message, data) {
  log('WARN', message, data);
}

/**
 * 错误日志
 */
function error(message, data) {
  log('ERROR', message, data);
}

module.exports = {
  setLevel,
  debug,
  info,
  warn,
  error
};