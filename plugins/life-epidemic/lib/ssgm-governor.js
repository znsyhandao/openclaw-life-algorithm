// life-epidemic/lib/ssgm-governor.js
// SSGM记忆演化治理引擎 v10.0
// 修正：去掉“量子干涉”，改为“相关性修正”
// 核心：三重验证 + 寄生虫智能 + 攻击模式学习

const crypto = require('crypto');
const logger = require('./logger');

class SSGMGovernorV10 {
  constructor() {
    // 治理规则
    this.rules = {
      consistency: {
        threshold: 0.7,
        dynamic: true,           // 动态调整
        historyWindow: 30        // 30天历史
      },
      decay: {
        halfLife: 30,            // 30天半衰期
        maxAge: 90,              // 最大存活90天
        archiveThreshold: 0.15    // 归档阈值
      },
      drift: {
        threshold: 0.3,
        adaptiveThreshold: true   // 自适应阈值
      }
    };
    
    // 寄生虫智能模块
    this.parasitic = {
      honeypotEnabled: true,      // 诱饵部署
      fossilEnabled: true,        // 记忆化石
      variantStudy: true          // 变异研究
    };
    
    // 相关性修正矩阵（不是量子干涉）
    this.correlationMatrix = this.initCorrelationMatrix();
    
    // 攻击模式库
    this.attackPatterns = new Map();
    
    // 历史数据
    this.validationHistory = [];
  }

  /**
   * 核心：记忆治理
   */
  async govern(memory, context) {
    const start = Date.now();
    
    // 1. 经典三重验证
    const classical = await this.classicalValidation(memory);
    
    // 2. 相关性修正（考虑验证项之间的相互影响）
    let finalProbability = classical.probability;
    if (this.shouldApplyCorrection(classical)) {
      finalProbability = this.applyCorrelationCorrection(
        classical.probabilities,
        classical.correlations
      );
    }
    
    // 3. 寄生虫智能处理
    const parasiticAction = await this.parasiticProcessing(memory, classical);
    
    // 4. 决策
    const decision = this.makeDecision(finalProbability, parasiticAction, classical);
    
    // 5. 记录验证历史
    this.recordValidation(memory.id, classical, decision);
    
    // 6. 学习攻击模式
    if (classical.anomalyScore > 0.7) {
      await this.learnAttackPattern(memory, classical);
    }
    
    // 7. 动态调整阈值
    if (this.rules.drift.adaptiveThreshold) {
      this.adaptThresholds(classical);
    }
    
    return {
      memoryId: memory.id,
      decision: decision.action,
      probability: finalProbability,
      parasiticAction: parasiticAction.action,
      latency: Date.now() - start,
      details: {
        classical: {
          consistency: classical.consistency.score,
          decay: classical.decay.factor,
          drift: classical.drift.score,
          probability: classical.probability
        },
        corrected: finalProbability !== classical.probability,
        parasitic: parasiticAction,
        anomalyScore: classical.anomalyScore
      }
    };
  }

  /**
   * 经典三重验证
   */
  async classicalValidation(memory) {
    // 1. 一致性验证
    const consistency = await this.verifyConsistency(memory);
    
    // 2. 时序衰减
    const decay = this.calculateDecay(memory);
    
    // 3. 语义漂移
    const drift = await this.detectDrift(memory);
    
    // 计算各维度分数
    const probabilities = {
      consistency: consistency.score,
      decay: decay.factor,
      drift: 1 - drift.score  // 漂移分数越低越好，所以用1-分数
    };
    
    // 计算联合概率（经典乘法）
    const classicalProbability = 
      probabilities.consistency * 
      probabilities.decay * 
      probabilities.drift;
    
    // 计算异常分数（越低越异常）
    const anomalyScore = 1 - classicalProbability;
    
    // 计算各维度之间的相关性
    const correlations = this.computeCorrelations(probabilities, memory);
    
    return {
      probabilities,
      probability: classicalProbability,
      consistency,
      decay,
      drift,
      anomalyScore,
      correlations,
      passed: classicalProbability >= 0.5  // 简单阈值
    };
  }

  /**
   * 一致性验证
   */
  async verifyConsistency(memory) {
    const similar = await this.findSimilarMemories(memory);
    if (similar.length === 0) {
      return { 
        score: 1.0, 
        passed: true,
        similarCount: 0 
      };
    }
    
    // 计算与现有记忆的一致性
    let totalScore = 0;
    const conflicts = [];
    
    for (const sim of similar) {
      const consistencyScore = this.calculateConsistency(memory, sim);
      totalScore += consistencyScore;
      
      if (consistencyScore < 0.5) {
        conflicts.push({
          memoryId: sim.id,
          text: sim.text.substring(0, 50),
          score: consistencyScore
        });
      }
    }
    
    const score = totalScore / similar.length;
    
    return {
      score,
      passed: score >= this.rules.consistency.threshold,
      similarCount: similar.length,
      conflicts: conflicts.slice(0, 5)  // 最多返回5个冲突
    };
  }

  /**
   * 时序衰减
   */
  calculateDecay(memory) {
    const timestamp = memory.timestamp ? new Date(memory.timestamp).getTime() : Date.now();
    const age = (Date.now() - timestamp) / (1000 * 60 * 60 * 24); // 天数
    
    // 艾宾浩斯指数衰减
    const factor = Math.exp(-age / this.rules.decay.halfLife);
    const expired = age > this.rules.decay.maxAge;
    
    return {
      age: Math.round(age * 10) / 10,
      factor: Math.round(factor * 100) / 100,
      expired,
      effectiveConfidence: memory.confidence ? 
        Math.round((memory.confidence * factor) * 100) / 100 : null
    };
  }

  /**
   * 语义漂移检测
   */
  async detectDrift(memory) {
    const baseline = await this.getBaselineMemory(memory.topic);
    if (!baseline) {
      return { 
        score: 0, 
        passed: true,
        hasBaseline: false 
      };
    }
    
    // 计算语义相似度
    const similarity = this.calculateSemanticSimilarity(memory, baseline);
    const driftScore = 1 - similarity;
    
    // 获取历史漂移记录
    const driftHistory = await this.getDriftHistory(memory.topic);
    
    // 计算漂移趋势（是否在加速）
    let trend = 'stable';
    if (driftHistory.length > 2) {
      const recent = driftHistory.slice(-3).map(d => d.score);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const oldAvg = driftHistory.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      
      if (avgRecent > oldAvg * 1.5) trend = 'accelerating';
      else if (avgRecent > oldAvg * 1.2) trend = 'increasing';
    }
    
    return {
      score: Math.round(driftScore * 100) / 100,
      passed: driftScore < this.rules.drift.threshold,
      baselineId: baseline.id,
      baselineText: baseline.text.substring(0, 50),
      similarity: Math.round(similarity * 100) / 100,
      trend,
      historyCount: driftHistory.length
    };
  }

  /**
   * 相关性修正（不是量子干涉）
   */
  applyCorrelationCorrection(probabilities, correlations) {
    // 经典概率
    const classical = probabilities.consistency * probabilities.decay * probabilities.drift;
    
    // 修正项：考虑维度之间的相关性
    // 如果两个维度高度相关，联合概率应该比独立乘积更大
    // 如果两个维度负相关，联合概率应该更小
    let correction = 0;
    
    // 一致性 vs 衰减
    const corr1 = correlations['consistency-decay'] || 0;
    correction += 0.1 * corr1 * Math.sqrt(probabilities.consistency * probabilities.decay);
    
    // 一致性 vs 漂移
    const corr2 = correlations['consistency-drift'] || 0;
    correction += 0.1 * corr2 * Math.sqrt(probabilities.consistency * probabilities.drift);
    
    // 衰减 vs 漂移
    const corr3 = correlations['decay-drift'] || 0;
    correction += 0.1 * corr3 * Math.sqrt(probabilities.decay * probabilities.drift);
    
    // 修正后的概率
    const corrected = classical + correction;
    
    // 限制在0-1之间
    return Math.min(1, Math.max(0, corrected));
  }

  /**
   * 判断是否需要应用相关性修正
   */
  shouldApplyCorrection(classical) {
    // 当某个维度明显异常时，启用修正
    const abnormalDimensions = [
      classical.consistency.score < 0.5,
      classical.decay.factor < 0.3,
      classical.drift.score > 0.5
    ].filter(Boolean).length;
    
    return abnormalDimensions >= 2;
  }

  /**
   * 寄生虫智能处理
   */
  async parasiticProcessing(memory, validation) {
    const action = {
      action: 'none',
      details: {}
    };
    
    // 1. 如果是一致性异常，部署诱饵
    if (!validation.consistency.passed && this.parasitic.honeypotEnabled) {
      const honeypotId = await this.deployHoneypot(memory);
      action.action = 'deceive';
      action.details.honeypotId = honeypotId;
      action.details.reason = '一致性异常，部署诱饵';
    }
    
    // 2. 如果已过期，转化为记忆化石
    if (validation.decay.expired && this.parasitic.fossilEnabled) {
      const fossilId = await this.preserveFossil(memory);
      action.action = action.action === 'none' ? 'archive' : action.action;
      action.details.fossilId = fossilId;
      action.details.reason = action.details.reason || '记忆过期，转化为化石';
    }
    
    // 3. 如果语义漂移，标记为变异株
    if (!validation.drift.passed && this.parasitic.variantStudy) {
      const variantId = await this.markVariant(memory, validation.drift);
      action.action = action.action === 'none' ? 'study' : action.action;
      action.details.variantId = variantId;
      action.details.driftScore = validation.drift.score;
      action.details.reason = action.details.reason || `语义漂移 ${validation.drift.score}，标记为变异株`;
    }
    
    return action;
  }

  /**
   * 决策
   */
  makeDecision(probability, parasiticAction, validation) {
    // 如果寄生虫已经有动作，优先采用
    if (parasiticAction.action !== 'none') {
      return { 
        action: parasiticAction.action, 
        reason: parasiticAction.details.reason,
        probability 
      };
    }
    
    // 基于概率决策
    if (probability < 0.3) {
      return { 
        action: 'reject', 
        reason: '概率过低，拒绝',
        probability 
      };
    }
    
    if (probability < 0.6) {
      return { 
        action: 'quarantine', 
        reason: '中等风险，需隔离',
        probability 
      };
    }
    
    if (probability < 0.8) {
      return { 
        action: 'review', 
        reason: '较低风险，建议人工抽查',
        probability 
      };
    }
    
    return { 
      action: 'accept', 
      reason: '安全',
      probability 
    };
  }

  /**
   * 部署诱饵
   */
  async deployHoneypot(memory) {
    const honeypot = {
      id: `hp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      originalId: memory.id,
      originalText: memory.text,
      text: this.generateDeceptiveText(memory),
      deployedAt: new Date().toISOString(),
      ttl: 24 * 60 * 60 * 1000,  // 24小时
      hits: 0
    };
    
    // 保存到数据库
    await this.saveHoneypot(honeypot);
    
    logger.info('诱饵已部署', { honeypotId: honeypot.id });
    
    return honeypot.id;
  }

  /**
   * 保存记忆化石
   */
  async preserveFossil(memory) {
    const fossil = {
      id: `fossil-${memory.id}`,
      memory: {
        id: memory.id,
        text: memory.text,
        timestamp: memory.timestamp,
        sourceType: memory.sourceType
      },
      preservedAt: new Date().toISOString(),
      reason: 'expired',
      decayInfo: memory.decayInfo || {}
    };
    
    await this.saveFossil(fossil);
    
    logger.info('记忆化石已保存', { fossilId: fossil.id });
    
    return fossil.id;
  }

  /**
   * 标记变异株
   */
  async markVariant(memory, driftInfo) {
    const variant = {
      id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      memoryId: memory.id,
      text: memory.text,
      driftScore: driftInfo.score,
      baselineId: driftInfo.baselineId,
      detectedAt: new Date().toISOString(),
      status: 'active'
    };
    
    await this.saveVariant(variant);
    
    logger.warn('检测到记忆变异', { 
      variantId: variant.id, 
      driftScore: variant.driftScore 
    });
    
    return variant.id;
  }

  /**
   * 学习攻击模式
   */
  async learnAttackPattern(memory, validation) {
    const features = this.extractFeatures(memory, validation);
    
    // 生成模式ID
    const patternId = crypto.createHash('sha256')
      .update(JSON.stringify(features))
      .digest('hex')
      .substring(0, 16);
    
    // 更新模式库
    if (!this.attackPatterns.has(patternId)) {
      this.attackPatterns.set(patternId, {
        id: patternId,
        features,
        firstSeen: new Date().toISOString(),
        count: 0
      });
    }
    
    const pattern = this.attackPatterns.get(patternId);
    pattern.count++;
    pattern.lastSeen = new Date().toISOString();
    
    // 如果模式出现多次，考虑调整阈值
    if (pattern.count >= 3) {
      await this.adjustThresholdForPattern(pattern);
    }
  }

  /**
   * 提取特征
   */
  extractFeatures(memory, validation) {
    return {
      consistencyScore: validation.consistency.score,
      decayScore: validation.decay.factor,
      driftScore: validation.drift.score,
      memoryLength: memory.text?.length || 0,
      sourceType: memory.sourceType || 'unknown',
      hasConflicts: (validation.consistency.conflicts?.length || 0) > 0,
      anomalyScore: validation.anomalyScore
    };
  }

  /**
   * 动态调整阈值
   */
  adaptThresholds(validation) {
    // 基于近期验证历史调整阈值
    this.validationHistory.push({
      timestamp: new Date().toISOString(),
      probability: validation.probability,
      anomalyScore: validation.anomalyScore
    });
    
    // 只保留最近100条
    if (this.validationHistory.length > 100) {
      this.validationHistory.shift();
    }
    
    // 每10次验证调整一次
    if (this.validationHistory.length % 10 === 0) {
      const avgProbability = this.validationHistory.reduce(
        (sum, v) => sum + v.probability, 0
      ) / this.validationHistory.length;
      
      // 如果平均概率偏高，适当提高阈值
      if (avgProbability > 0.8) {
        this.rules.consistency.threshold = Math.min(
          0.85,
          this.rules.consistency.threshold + 0.01
        );
        this.rules.drift.threshold = Math.min(
          0.4,
          this.rules.drift.threshold + 0.005
        );
      }
      
      // 如果平均概率偏低，适当降低阈值
      if (avgProbability < 0.4) {
        this.rules.consistency.threshold = Math.max(
          0.5,
          this.rules.consistency.threshold - 0.01
        );
        this.rules.drift.threshold = Math.max(
          0.2,
          this.rules.drift.threshold - 0.005
        );
      }
    }
  }

  /**
   * 记录验证历史
   */
  recordValidation(memoryId, validation, decision) {
    this.validationHistory.push({
      memoryId,
      timestamp: new Date().toISOString(),
      probability: validation.probability,
      anomalyScore: validation.anomalyScore,
      decision: decision.action
    });
    
    // 限制历史长度
    if (this.validationHistory.length > 1000) {
      this.validationHistory = this.validationHistory.slice(-1000);
    }
  }

  /**
   * 初始化相关性矩阵
   */
  initCorrelationMatrix() {
    // 经验性的相关性系数
    return {
      'consistency-decay': 0.2,   // 一致性和衰减弱相关
      'consistency-drift': 0.6,   // 一致性和漂移中度相关
      'decay-drift': 0.3           // 衰减和漂移弱相关
    };
  }

  /**
   * 计算相关性
   */
  computeCorrelations(probabilities, memory) {
    // 基于当前验证结果动态计算相关性
    return {
      'consistency-decay': this.calculateCorrelation(
        probabilities.consistency, 
        probabilities.decay
      ),
      'consistency-drift': this.calculateCorrelation(
        probabilities.consistency,
        probabilities.drift
      ),
      'decay-drift': this.calculateCorrelation(
        probabilities.decay,
        probabilities.drift
      )
    };
  }

  /**
   * 计算两个值之间的相关性
   */
  calculateCorrelation(a, b) {
    // 简单相关性计算
    const diff = Math.abs(a - b);
    return Math.max(0, 1 - diff);
  }

  /**
   * 生成诱饵文本
   */
  generateDeceptiveText(memory) {
    const templates = [
      `[诱饵] ${memory.text} (此版本已被标记)`,
      `系统密码: ${Math.random().toString(36).substring(7)}`,
      `API密钥: sk-${crypto.randomBytes(16).toString('hex')}`,
      `管理员令牌: ${crypto.randomBytes(8).toString('hex')}`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // ==================== 辅助方法（需实际实现）====================

  async findSimilarMemories(memory) {
    // 实际应调用向量数据库检索
    return [];
  }

  calculateConsistency(m1, m2) {
    // 实际应计算语义相似度
    return 0.8;
  }

  calculateSemanticSimilarity(m1, m2) {
    // 实际应计算嵌入向量相似度
    return 0.75;
  }

  async getBaselineMemory(topic) {
    // 从数据库获取基线记忆
    return null;
  }

  async getDriftHistory(topic) {
    // 获取历史漂移记录
    return [];
  }

  async saveHoneypot(honeypot) {
    // 保存到数据库
  }

  async saveFossil(fossil) {
    // 保存到数据库
  }

  async saveVariant(variant) {
    // 保存到数据库
  }

  async adjustThresholdForPattern(pattern) {
    // 根据模式调整阈值
    logger.info('调整阈值', { patternId: pattern.id, count: pattern.count });
  }
}

module.exports = SSGMGovernorV10;