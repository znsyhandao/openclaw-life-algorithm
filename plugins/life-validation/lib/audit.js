// lib/audit.js - 记忆审计核心模块
const fs = require('fs').promises;
const path = require('path');

/**
 * 记忆审计模块
 * 功能：扫描记忆库，检测过时、冲突、漂移
 */

// 配置参数
// lib/audit.js
const CONFIG = {
  HALF_LIFE_DAYS: 30,        // 记忆半衰期（天）
  STALE_THRESHOLD: 0.15,      // 过时阈值（调低到0.15）
  DRIFT_THRESHOLD: 0.3,       // 漂移检测阈值
  MIN_SAMPLES_FOR_DRIFT: 5    // 漂移检测最小样本数
};

/**
 * 加载所有记忆
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>} 记忆数组
 */
async function loadAllMemories(agentId) {
  const memoryDir = path.join(process.env.HOME || process.env.USERPROFILE, 
    'clawd', 'memory', agentId || 'default');
  
  const memories = [];
  
  try {
    // 读取 LIFE.md
    const lifeFile = path.join(memoryDir, 'LIFE.md');
    const lifeContent = await fs.readFile(lifeFile, 'utf8').catch(() => '');
    
    // 解析记忆条目
    const lines = lifeContent.split('\n');
    let currentDate = null;
    
    for (const line of lines) {
      // 解析日期标记：## 记忆更新 (YYYY-MM-DD)
      const dateMatch = line.match(/## 记忆更新 \((\d{4}-\d{2}-\d{2})\)/);
      if (dateMatch) {
        currentDate = new Date(dateMatch[1]);
        continue;
      }
      
      // 解析记忆内容：- 内容
      const memMatch = line.match(/^-\s*(.+)$/);
      if (memMatch && currentDate) {
        memories.push({
          text: memMatch[1],
          timestamp: currentDate,
          accessCount: 1,  // 默认访问次数，可从日志中读取实际值
          topic: extractTopic(memMatch[1])
        });
      }
    }
  } catch (err) {
    console.error('加载记忆失败:', err);
  }
  
  return memories;
}

/**
 * 提取主题关键词
 * @param {string} text - 记忆文本
 * @returns {string} 主题关键词
 */
function extractTopic(text) {
  // 简单实现：提取前两个中文字符
  const match = text.match(/[\u4e00-\u9fa5]{2,}/g);
  return match ? match[0] : 'general';
}

/**
 * 判断记忆是否过时
 * @param {Object} mem - 记忆对象
 * @returns {boolean} 是否过时
 */
function isStale(mem) {
  console.log('isStale 收到参数:', JSON.stringify(mem, null, 2));
  
  const age = Date.now() - mem.timestamp.getTime();
  const halfLife = CONFIG.HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;
  const freshness = Math.exp(-age / halfLife);
  
  const accessCount = mem.accessCount || 1;
  const importance = freshness * (1 + Math.log(accessCount));
  
  console.log(`计算: age=${age}, freshness=${freshness}, accessCount=${accessCount}, importance=${importance}`);
  console.log(`阈值: ${CONFIG.STALE_THRESHOLD}, 结果: ${importance < CONFIG.STALE_THRESHOLD}`);
  
  return importance < CONFIG.STALE_THRESHOLD;
}

/**
 * 检测冲突记忆
 * @param {Array} memories - 记忆数组
 * @returns {Array} 冲突对列表
 */
function detectConflicts(memories) {
  const conflicts = [];
  const conflictPairs = [
    ['喜欢', '不喜欢'],
    ['是', '不是'],
    ['有', '没有'],
    ['可以', '不可以'],
    ['会', '不会']
  ];
  
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const memA = memories[i];
      const memB = memories[j];
      
      // 只比较相同主题的记忆
      if (memA.topic !== memB.topic) continue;
      
      for (const [pos, neg] of conflictPairs) {
        if ((memA.text.includes(pos) && memB.text.includes(neg)) ||
            (memA.text.includes(neg) && memB.text.includes(pos))) {
          conflicts.push({
            id: `conflict_${i}_${j}`,
            memoryA: memA,
            memoryB: memB,
            severity: 'medium',
            type: 'sentiment_conflict'
          });
          break;
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * 检测概念漂移
 * @param {Array} memories - 记忆数组
 * @returns {Array} 漂移项列表
 */
function detectDrift(memories) {
  const drifts = [];
  
  // 按主题分组
  const topics = {};
  memories.forEach(mem => {
    if (!topics[mem.topic]) topics[mem.topic] = [];
    topics[mem.topic].push(mem);
  });
  
  // 对每个主题检测漂移
  for (const [topic, topicMems] of Object.entries(topics)) {
    if (topicMems.length < CONFIG.MIN_SAMPLES_FOR_DRIFT) continue;
    
    // 按时间排序
    topicMems.sort((a, b) => a.timestamp - b.timestamp);
    
    // 取前30%作为旧样本，后30%作为新样本
    const splitIndex = Math.floor(topicMems.length * 0.3);
    const oldMems = topicMems.slice(0, splitIndex);
    const newMems = topicMems.slice(-splitIndex);
    
    if (oldMems.length < 2 || newMems.length < 2) continue;
    
    // 计算情感倾向（简单实现：统计正面/负面词）
    const oldSentiment = calculateSentiment(oldMems);
    const newSentiment = calculateSentiment(newMems);
    
    // 用KS检验简化版：比较均值差异
    const driftScore = Math.abs(oldSentiment - newSentiment);
    
    if (driftScore > CONFIG.DRIFT_THRESHOLD) {
      drifts.push({
        topic,
        oldValue: oldSentiment > 0 ? '正面倾向' : '负面倾向',
        newValue: newSentiment > 0 ? '正面倾向' : '负面倾向',
        score: driftScore,
        oldCount: oldMems.length,
        newCount: newMems.length,
        examples: {
          old: oldMems.slice(0, 2).map(m => m.text),
          new: newMems.slice(0, 2).map(m => m.text)
        }
      });
    }
  }
  
  return drifts;
}

/**
 * 计算情感倾向（简单实现）
 * @param {Array} mems - 记忆数组
 * @returns {number} -1到1之间的分数
 */
function calculateSentiment(mems) {
  const positiveWords = ['喜欢', '爱', '好', '可以', '是', '有', '会'];
  const negativeWords = ['不喜欢', '不爱', '不好', '不可以', '不是', '没有', '不会'];
  
  let score = 0;
  mems.forEach(mem => {
    positiveWords.forEach(word => {
      if (mem.text.includes(word)) score += 1;
    });
    negativeWords.forEach(word => {
      if (mem.text.includes(word)) score -= 1;
    });
  });
  
  return score / mems.length;
}

/**
 * 生成审计报告
 * @param {Array} memories - 所有记忆
 * @returns {Object} 报告对象
 */
async function generateAuditReport(agentId) {
  const memories = await loadAllMemories(agentId);
  
  const report = {
    total: memories.length,
    stale: [],
    conflicting: [],
    drifted: [],
    healthy: []
  };
  
  // 检测过时记忆
  memories.forEach(mem => {
    if (isStale(mem)) {
      report.stale.push(mem);
    } else {
      report.healthy.push(mem);
    }
  });
  
  // 检测冲突
  report.conflicting = detectConflicts(memories);
  
  // 检测漂移
  report.drifted = detectDrift(memories);
  
  // 计算健康分数
  report.healthScore = Math.round(
    (report.healthy.length / report.total) * 100
  );
  
  return report;
}

/**
 * 格式化报告为可读文本
 * @param {Object} report - 报告对象
 * @returns {string} 格式化后的报告
 */
function formatReport(report) {
  let output = [];
  
  output.push('📊 记忆健康报告');
  output.push('='.repeat(40));
  output.push(`总记忆数: ${report.total}`);
  output.push(`健康分数: ${report.healthScore}/100`);
  output.push('');
  
  if (report.stale.length > 0) {
    output.push(`📌 过时记忆 (${report.stale.length}条)`);
    report.stale.slice(0, 5).forEach(mem => {
      const days = Math.floor((Date.now() - mem.timestamp) / (24*60*60*1000));
      output.push(`  - ${mem.text} (${days}天前，访问${mem.accessCount}次)`);
    });
    if (report.stale.length > 5) {
      output.push(`  ... 还有${report.stale.length - 5}条过时记忆`);
    }
    output.push('');
  }
  
  if (report.conflicting.length > 0) {
    output.push(`⚡ 冲突记忆 (${report.conflicting.length}对)`);
    report.conflicting.slice(0, 3).forEach(conflict => {
      output.push(`  - "${conflict.memoryA.text}"`);
      output.push(`    vs "${conflict.memoryB.text}"`);
      output.push(`    建议: 运行 /resolve ${conflict.id} <保留旧|保留新|合并>`);
    });
    if (report.conflicting.length > 3) {
      output.push(`  ... 还有${report.conflicting.length - 3}对冲突`);
    }
    output.push('');
  }
  
  if (report.drifted.length > 0) {
    output.push(`🔄 偏好漂移 (${report.drifted.length}项)`);
    report.drifted.forEach(drift => {
      output.push(`  - 主题: ${drift.topic}`);
      output.push(`    变化: ${drift.oldValue} → ${drift.newValue}`);
      output.push(`    示例:`);
      output.push(`      旧: ${drift.examples.old.join('; ')}`);
      output.push(`      新: ${drift.examples.new.join('; ')}`);
    });
    output.push('');
  }
  
  if (report.healthy.length > 0) {
    output.push(`✅ 健康记忆 (${report.healthy.length}条)`);
    output.push(`  记忆系统运行良好！`);
  }
  
  output.push('');
  output.push('💡 建议操作:');
  if (report.stale.length > 0) output.push('  - 用 /remember 更新过时记忆');
  if (report.conflicting.length > 0) output.push('  - 用 /resolve 裁决冲突');
  if (report.drifted.length > 0) output.push('  - 确认偏好变化，用 /remember 记录新偏好');
  output.push('  - 定期运行 /audit-memory 保持记忆健康');
  
  return output.join('\n');
}

module.exports = {
  generateAuditReport,
  formatReport,
  isStale,
  detectConflicts,
  detectDrift
};