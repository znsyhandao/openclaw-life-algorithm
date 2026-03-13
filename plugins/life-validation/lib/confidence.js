// lib/confidence.js - 可信度计算（带情绪权重）
const logger = require('./logger');

// 来源可信度基础分
const SOURCE_CONFIDENCE = {
  "user_explicit": 0.95,    // 用户明确说
  "user_implicit": 0.80,    // 用户自然提及
  "ai_inferred": 0.60,      // AI推断
  "other_ai": 0.40,         // 其他AI分享
  "web_learned": 0.30       // 网页学习
};

// 情感词库
const EMOTION_WEIGHTS = {
  high: ['痛恨', '深爱', '绝不', '永远', '绝对', '发誓', '保证'],
  medium: ['喜欢', '讨厌', '希望', '不想', '愿意', '拒绝']
};

class ConfidenceScorer {
  constructor(halfLifeDays = 30) {
    this.halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
    this.version = '1.2.0';
  }

  /**
   * 计算单条记忆可信度
   */
  calculate(text, sourceType, timestamp = null, context = null) {
    // 1. 基础分
    let score = SOURCE_CONFIDENCE[sourceType] || 0.5;
    
    // 2. 情绪权重（代入人类情感）
    score *= this._emotionalWeight(text);
    
    // 3. 时间衰减
    if (timestamp) {
      score *= this._timeDecay(timestamp);
    }
    
    // 4. 上下文增强
    if (context) {
      score *= this._contextBoost(context);
    }
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * 情绪权重计算
   */
  _emotionalWeight(text) {
    let weight = 1.0;
    const lowerText = text.toLowerCase();
    
    // 高强度情感
    for (const word of EMOTION_WEIGHTS.high) {
      if (lowerText.includes(word)) {
        weight *= 1.2;
        logger.debug('情绪权重触发', { word, type: 'high', weight });
      }
    }
    
    // 中强度情感
    for (const word of EMOTION_WEIGHTS.medium) {
      if (lowerText.includes(word)) {
        weight *= 1.1;
        logger.debug('情绪权重触发', { word, type: 'medium', weight });
      }
    }
    
    return Math.min(1.5, weight); // 最高权重1.5
  }

  /**
   * 时间衰减（指数衰减）
   */
  _timeDecay(timestamp) {
    const age = Date.now() - new Date(timestamp).getTime();
    if (age <= 0) return 1.0;
    
    // 指数衰减公式：exp(-age / halfLife)
    return Math.exp(-age / this.halfLifeMs);
  }

  /**
   * 上下文增强
   */
  _contextBoost(context) {
    let boost = 1.0;
    
    // 如果有多条相关记忆，增强可信度
    if (context.relatedCount > 3) {
      boost *= 1.1;
    }
    
    // 如果用户之前确认过，增强
    if (context.userConfirmed) {
      boost *= 1.2;
    }
    
    return boost;
  }

  /**
   * 批量计算
   */
  async batchCalculate(memories, threshold = 0.6) {
    const results = [];
    
    for (const mem of memories) {
      const score = this.calculate(
        mem.text,
        mem.sourceType,
        mem.timestamp,
        mem.context
      );
      
      results.push({
        ...mem,
        confidence: score,
        version: this.version
      });
    }
    
    // 过滤并排序
    return results
      .filter(m => m.confidence >= threshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 自我可答性评估
   */
  estimateAnswerability(query, memories) {
    if (!query || memories.length === 0) {
      return { knows: false, reason: 'insufficient_data' };
    }
    
    // 语义匹配（简化版）
    const relevant = memories.filter(m => 
      m.text && m.text.includes(query.substring(0, 10))
    );
    
    if (relevant.length === 0) {
      return { knows: false, reason: 'no_match' };
    }
    
    const avgConfidence = relevant.reduce((sum, m) => sum + (m.confidence || 0.5), 0) / relevant.length;
    
    if (avgConfidence < 0.3) {
      return { knows: false, confidence: avgConfidence, reason: 'too_unreliable' };
    } else if (avgConfidence < 0.6) {
      return { knows: 'partial', confidence: avgConfidence, reason: 'needs_validation' };
    } else {
      return { knows: true, confidence: avgConfidence, reason: 'confident' };
    }
  }
}

module.exports = new ConfidenceScorer();