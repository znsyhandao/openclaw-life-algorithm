// lib/validation-core.js - 核心逻辑整合
const confidence = require('./confidence');
const conflict = require('./conflict');
const logger = require('./logger');

class ValidationCore {
  constructor() {
    this.version = '1.2.0';
    this.cognitiveLoadThreshold = 10;
  }

  /**
   * 综合验证入口
   */
  async validate(context) {
    const { agentId, messages, longTerm } = context;
    
    // 1. 计算认知负荷
    const cognitiveLoad = this.calculateCognitiveLoad(context);
    logger.debug('认知负荷', { agentId, score: cognitiveLoad.score });
    
    // 2. 可信度评估
    const confidenceScores = await confidence.batchCalculate(longTerm);
    
    // 3. 冲突检测
    const conflicts = conflict.detect(messages, longTerm);
    
    // 4. 自我可答性评估
    const answerability = this.estimateAnswerability(messages, longTerm);
    
    return {
      cognitiveLoad,
      confidenceScores,
      conflicts,
      answerability,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 计算认知负荷
   */
  calculateCognitiveLoad(context) {
    const memoryCount = context.longTerm?.length || 0;
    const conflictCount = context.conflicts?.length || 0;
    const messageCount = context.messages?.length || 0;
    
    // 认知负荷指数公式
    const loadScore = memoryCount * 0.1 + conflictCount * 0.3 + messageCount * 0.05;
    
    return {
      score: loadScore,
      overloaded: loadScore > this.cognitiveLoadThreshold,
      components: { memoryCount, conflictCount, messageCount },
      suggestion: loadScore > 10 ? '⚠️ 认知负荷过高，建议人工介入' : '✅ 负荷正常'
    };
  }

  /**
   * 自我可答性评估
   */
  estimateAnswerability(messages, memories) {
    if (!messages || messages.length === 0) {
      return { knows: false, reason: 'no_query' };
    }
    
    const lastQuery = messages[messages.length - 1]?.content || '';
    if (!lastQuery) {
      return { knows: false, reason: 'empty_query' };
    }
    
    // 简单关键词匹配
    const relevantMemories = memories.filter(m => 
      m.text && m.text.includes(lastQuery.substring(0, 5))
    );
    
    if (relevantMemories.length === 0) {
      return { knows: false, reason: 'no_memory' };
    }
    
    const avgConfidence = relevantMemories.reduce((sum, m) => 
      sum + (m.confidence || 0.5), 0) / relevantMemories.length;
    
    if (avgConfidence < 0.3) {
      return { knows: false, confidence: avgConfidence, reason: 'unreliable' };
    } else if (avgConfidence < 0.6) {
      return { knows: 'partial', confidence: avgConfidence, reason: 'needs_validation' };
    } else {
      return { knows: true, confidence: avgConfidence, reason: 'confident' };
    }
  }
}

module.exports = new ValidationCore();