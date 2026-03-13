// lib/conflict.js - 冲突检测（带认知负荷）
const logger = require('./logger');

class ConflictDetector {
  constructor() {
    this.version = '1.2.0';
    
    // 冲突模式库
    this.conflictPatterns = [
      { pattern: /喜欢(.*?)不喜欢/, type: 'preference' },
      { pattern: /是(.*?)不是/, type: 'identity' },
      { pattern: /有(.*?)没有/, type: 'possession' },
      { pattern: /可以(.*?)不可以/, type: 'capability' },
      { pattern: /会(.*?)不会/, type: 'ability' }
    ];
    
    // 高冲突风险主题
    this.highRiskTopics = ['名字', '身份', '密码', '密钥', '金额', '时间'];
  }

  /**
   * 主检测入口
   */
  detect(messages, existingMemories, cognitiveLoad = null) {
    if (!messages || messages.length === 0) {
      return { conflicts: [], count: 0 };
    }
    
    // 提取新记忆
    const newMemories = this._extractMemories(messages);
    
    if (newMemories.length === 0) {
      return { conflicts: [], count: 0 };
    }
    
    // 构建主题索引
    const topicIndex = this._buildTopicIndex(existingMemories);
    
    // 检测冲突
    const conflicts = [];
    for (const newMem of newMemories) {
      const related = topicIndex[newMem.keyword] || [];
      for (const oldMem of related) {
        if (this._isConflicting(newMem.text, oldMem.text)) {
          conflicts.push(this._createConflict(newMem, oldMem, cognitiveLoad));
        }
      }
    }
    
    // 记录冲突日志
    if (conflicts.length > 0) {
      logger.warn('检测到冲突', { count: conflicts.length, conflicts });
    }
    
    return {
      conflicts,
      count: conflicts.length,
      cognitiveLoad: cognitiveLoad,
      version: this.version
    };
  }

  /**
   * 从消息中提取可记忆信息
   */
  _extractMemories(messages) {
    const memories = [];
    const userMessages = messages.filter(m => m.role === 'user');
    
    for (const msg of userMessages.slice(-5)) { // 只处理最近5条
      const text = msg.content;
      if (!text || text.startsWith('/')) continue; // 跳过命令
      
      // 提取关键词
      const keywords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      
      for (const keyword of keywords.slice(0, 3)) { // 最多3个关键词
        memories.push({
          text,
          keyword,
          timestamp: new Date().toISOString(),
          sourceType: this._detectSourceType(text)
        });
      }
    }
    
    return memories;
  }

  /**
   * 检测来源类型
   */
  _detectSourceType(text) {
    if (text.includes('记住') || text.includes('我叫') || text.includes('我是')) {
      return 'user_explicit';
    } else if (text.includes('喜欢') || text.includes('希望') || text.includes('觉得')) {
      return 'user_implicit';
    } else {
      return 'ai_inferred';
    }
  }

  /**
   * 构建主题索引
   */
  _buildTopicIndex(memories) {
    const index = {};
    
    for (const mem of memories) {
      if (!mem.text) continue;
      
      const keywords = mem.text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      for (const kw of keywords) {
        if (!index[kw]) index[kw] = [];
        index[kw].push(mem);
      }
    }
    
    return index;
  }

  /**
   * 判断两条记忆是否冲突
   */
  _isConflicting(newText, oldText) {
    const newLower = newText.toLowerCase();
    const oldLower = oldText.toLowerCase();
    
    for (const { pattern } of this.conflictPatterns) {
      // 检查正向-反向关系
      if (pattern.test(newLower) && pattern.test(oldLower)) {
        return true;
      }
    }
    
    // 直接否定关系
    const negationPairs = [
      ['喜欢', '不喜欢'],
      ['是', '不是'],
      ['有', '没有'],
      ['可以', '不可以'],
      ['会', '不会']
    ];
    
    for (const [pos, neg] of negationPairs) {
      if (newLower.includes(pos) && oldLower.includes(neg)) return true;
      if (newLower.includes(neg) && oldLower.includes(pos)) return true;
    }
    
    return false;
  }

  /**
   * 创建冲突对象
   */
  _createConflict(newMem, oldMem, cognitiveLoad) {
    const id = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const severity = this._assessSeverity(newMem.text, oldMem.text);
    
    // 如果认知负荷高，提高冲突等级
    const adjustedSeverity = cognitiveLoad?.overloaded ? 
      (severity === 'medium' ? 'high' : severity) : severity;
    
    return {
      id,
      timestamp: new Date().toISOString(),
      keyword: newMem.keyword,
      newMemory: newMem.text,
      oldMemory: oldMem.text,
      severity: adjustedSeverity,
      status: 'pending',
      cognitiveLoad: cognitiveLoad?.score || 0,
      resolveCommand: `/resolve ${id} 保留旧|保留新|合并`
    };
  }

  /**
   * 评估冲突严重程度
   */
  _assessSeverity(newText, oldText) {
    // 检查是否包含高风险词
    for (const topic of this.highRiskTopics) {
      if (newText.includes(topic) || oldText.includes(topic)) {
        return 'high';
      }
    }
    
    // 检查情感强度
    const highEmotion = /痛恨|深爱|绝不|永远|绝对/.test(newText + oldText);
    if (highEmotion) return 'high';
    
    // 检查是否有数字（如金额、时间）
    const hasNumbers = /\d+/.test(newText + oldText);
    if (hasNumbers) return 'medium';
    
    return 'low';
  }
}

module.exports = new ConflictDetector();