// life-epidemic/lib/bayesian-trust-v10.js
// 贝叶斯信任演化引擎 v10.0
// 集成：7维证据 + 生存预测 + 三层行为分析
// 修改：使用 Python 调用 SQLite 数据库

const crypto = require('crypto');
const logger = require('./logger');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

class BayesianTrustV10 {
  constructor() {
    // 先验概率
    this.prior = {
      trustworthy: 0.95,
      malicious: 0.05
    };
    
    // 7维证据权重（初始值）
    this.evidenceWeights = {
      conflictRate: 0.25,
      consistency: 0.20,
      novelty: 0.15,
      reportRate: 0.20,
      semanticCoherence: 0.20,
      temporalPattern: 0.15,
      crossAgentConsistency: 0.25
    };
    
    // 三层行为分析
    this.layers = {
      crossProject: {
        enabled: true,
        weight: 0.4
      },
      projectContext: {
        enabled: true,
        weight: 0.35
      },
      workflowPattern: {
        enabled: true,
        weight: 0.25
      }
    };
    
    // 生存预测参数
    this.survival = {
      horizon: 30,           // 预测30步
      threshold: 0.4,        // 生存阈值
      markovOrder: 3         // 3阶马尔可夫
    };
    
    // 动态权重学习
    this.learningRate = 0.01;
    this.weightHistory = [];
  }

  /**
   * 核心：计算用户信任分数
   */
  async calculateTrust(userHash) {
    const start = Date.now();
    
    // 1. 收集多维证据
    const evidence = await this.gatherEvidence(userHash);
    
    // 2. 三层行为分析
    const layeredAnalysis = await this.layeredAnalysis(userHash);
    
    // 3. 贝叶斯更新
    const posterior = this.bayesianUpdate(evidence, layeredAnalysis);
    
    // 4. 生存预测
    const survival = await this.predictSurvival(userHash, posterior);
    
    // 5. 动态权重调整
    this.updateWeights(evidence, posterior);
    
    return {
      userHash,
      trustScore: posterior.trustworthy,
      maliciousProb: posterior.malicious,
      survivalProb: survival.probability,
      survivalTime: survival.predictedTime,
      evidence,
      layeredAnalysis,
      latency: Date.now() - start
    };
  }

  /**
   * 收集7维证据
   */
  async gatherEvidence(userHash) {
    const db = await this.getDB();
    
    return {
      conflictRate: await this.calculateConflictRate(db, userHash),
      consistency: await this.calculateConsistency(db, userHash),
      novelty: await this.calculateNovelty(db, userHash),
      reportRate: await this.calculateReportRate(db, userHash),
      semanticCoherence: await this.calculateSemanticCoherence(db, userHash),
      temporalPattern: await this.calculateTemporalPattern(db, userHash),
      crossAgentConsistency: await this.calculateCrossAgentConsistency(db, userHash)
    };
  }

  /**
   * 三层行为分析
   */
  async layeredAnalysis(userHash) {
    const db = await this.getDB();
    
    // 1. 跨项目层：技术偏好一致性
    const crossProject = await this.analyzeCrossProject(db, userHash);
    
    // 2. 项目上下文：当前项目行为模式
    const projectContext = await this.analyzeProjectContext(db, userHash);
    
    // 3. 工作流模式：操作序列规律性
    const workflowPattern = await this.analyzeWorkflowPattern(db, userHash);
    
    return {
      crossProject: {
        score: crossProject,
        weight: this.layers.crossProject.weight
      },
      projectContext: {
        score: projectContext,
        weight: this.layers.projectContext.weight
      },
      workflowPattern: {
        score: workflowPattern,
        weight: this.layers.workflowPattern.weight
      },
      combined: this.combineLayers(crossProject, projectContext, workflowPattern)
    };
  }


  /**
   * 贝叶斯更新（用加权平均代替连乘）
   */
  bayesianUpdate(evidence, layeredAnalysis) {
    // 1. 计算加权平均证据值
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [key, weight] of Object.entries(this.evidenceWeights)) {
      const value = evidence[key] || 0.5;
      weightedSum += value * weight;
      totalWeight += weight;
    }
    
    // 平均证据值 (0-1之间)
    const averageEvidence = weightedSum / totalWeight;
    
    // 2. 三层分析贡献（也作为证据的一部分）
    const combinedLayers = layeredAnalysis.combined || 0.5;
    
    // 最终证据值 = 7维证据平均 × 三层分析
    const finalEvidence = averageEvidence * combinedLayers;
    
    // 3. 后验概率（直接用证据值作为似然）
    const posterior = {
      trustworthy: this.prior.trustworthy * finalEvidence,
      malicious: this.prior.malicious * (1 - finalEvidence)
    };
    
    // 4. 归一化
    const sum = posterior.trustworthy + posterior.malicious;
    posterior.trustworthy /= sum;
    posterior.malicious /= sum;
    
    return posterior;
  }

  /**
   * 生存预测（马尔可夫链）
   */
  async predictSurvival(userHash, posterior) {
    // 获取信任历史
    const history = await this.getTrustHistory(userHash, 100);
    
    if (history.length < this.survival.markovOrder) {
      return {
        probability: posterior.trustworthy > this.survival.threshold ? 0.8 : 0.2,
        predictedTime: 7,
        confidence: 0.5
      };
    }
    
    // 构建马尔可夫链
    const markov = this.buildMarkovChain(history);
    
    // 预测未来30步的信任轨迹
    let survivalProbability = 1.0;
    let currentState = this.discretizeState(posterior.trustworthy);
    
    for (let step = 0; step < this.survival.horizon; step++) {
      const nextState = this.sampleNextState(markov, currentState);
      const trustValue = this.continuousValue(nextState);
      
      if (trustValue < this.survival.threshold) {
        survivalProbability *= 0.5;  // 一旦低于阈值，生存概率减半
      }
      
      currentState = nextState;
    }
    
    // 计算期望生存时间
    let expectedTime = 0;
    for (let t = 1; t <= this.survival.horizon; t++) {
      expectedTime += t * survivalProbability * (1 - survivalProbability);
    }
    
    return {
      probability: survivalProbability,
      predictedTime: Math.round(expectedTime),
      confidence: history.length > 50 ? 0.9 : 0.7
    };
  }

  /**
   * 动态权重更新
   */
  updateWeights(evidence, posterior) {
    const prediction = posterior.trustworthy;
    const actual = evidence.conflictRate;  // 简化，实际应更复杂
    
    const error = actual - prediction;
    
    // 梯度下降更新权重
    for (const [key, value] of Object.entries(evidence)) {
      if (this.evidenceWeights[key]) {
        const gradient = error * value;
        this.evidenceWeights[key] += this.learningRate * gradient;
        
        // 确保权重在合理范围
        this.evidenceWeights[key] = Math.max(0, Math.min(1, this.evidenceWeights[key]));
      }
    }
    
    // 记录历史
    this.weightHistory.push({
      timestamp: new Date().toISOString(),
      weights: { ...this.evidenceWeights }
    });
  }

  /**
   * 组合三层分析
   */
  combineLayers(cross, context, workflow) {
    return (cross * this.layers.crossProject.weight +
            context * this.layers.projectContext.weight +
            workflow * this.layers.workflowPattern.weight) /
           (this.layers.crossProject.weight +
            this.layers.projectContext.weight +
            this.layers.workflowPattern.weight);
  }

  /**
   * 跨项目分析
   */
  async analyzeCrossProject(db, userHash) {
    // 这里应该查询数据库，暂时返回模拟值
    return 0.8;
  }

  /**
   * 项目上下文分析
   */
  async analyzeProjectContext(db, userHash) {
    return 0.75;
  }

  /**
   * 工作流模式分析
   */
  async analyzeWorkflowPattern(db, userHash) {
    return 0.85;
  }

  /**
   * 构建马尔可夫链
   */
  buildMarkovChain(history) {
    const states = [0, 1, 2, 3];  // 4个信任状态
    const transitions = {};
    
    for (let i = 0; i < history.length - this.survival.markovOrder; i++) {
      const key = history.slice(i, i + this.survival.markovOrder).join('-');
      const next = history[i + this.survival.markovOrder];
      
      if (!transitions[key]) {
        transitions[key] = {};
      }
      transitions[key][next] = (transitions[key][next] || 0) + 1;
    }
    
    // 归一化
    for (const key in transitions) {
      const total = Object.values(transitions[key]).reduce((a, b) => a + b, 0);
      for (const next in transitions[key]) {
        transitions[key][next] /= total;
      }
    }
    
    return transitions;
  }

  /**
   * 离散化信任状态
   */
  discretizeState(trust) {
    if (trust < 0.25) return 0;
    if (trust < 0.5) return 1;
    if (trust < 0.75) return 2;
    return 3;
  }

  /**
   * 连续化信任值
   */
  continuousValue(state) {
    return state * 0.25 + 0.125;
  }

  /**
   * 从马尔可夫链采样下一状态
   */
  sampleNextState(markov, currentState) {
    const key = currentState.toString();
    if (!markov[key]) return currentState;
    
    const probs = markov[key];
    const rand = Math.random();
    let cum = 0;
    
    for (const [next, prob] of Object.entries(probs)) {
      cum += prob;
      if (rand < cum) return parseInt(next);
    }
    
    return currentState;
  }

  /**
   * 获取数据库连接（通过 Python 调用）
   */
  getDB() {
    // 返回一个适配器对象，通过 Python 访问数据库
    return {
      get: async (sql, params, callback) => {
        try {
          // 转义 SQL 语句中的引号
          const escapedSql = sql.replace(/"/g, '\\"');
          const pythonScript = path.join(__dirname, '../../life-validation-service/db_helper.py');
          const { stdout } = await execPromise(`python "${pythonScript}" "${escapedSql}"`);
          
          // 解析 Python 返回的 JSON
          const result = JSON.parse(stdout);
          
          // 如果是数组，返回第一个元素
          if (Array.isArray(result) && result.length > 0) {
            callback(null, result[0]);
          } else {
            callback(null, null);
          }
        } catch (err) {
          console.error('数据库查询失败:', err);
          callback(err);
        }
      },
      
      all: async (sql, params, callback) => {
        try {
          const escapedSql = sql.replace(/"/g, '\\"');
          const pythonScript = path.join(__dirname, '../../life-validation-service/db_helper.py');
          const { stdout } = await execPromise(`python "${pythonScript}" "${escapedSql}"`);
          
          const result = JSON.parse(stdout);
          callback(null, result);
        } catch (err) {
          console.error('数据库查询失败:', err);
          callback(err);
        }
      },
      
      run: async (sql, params, callback) => {
        try {
          const escapedSql = sql.replace(/"/g, '\\"');
          const pythonScript = path.join(__dirname, '../../life-validation-service/db_helper.py');
          await execPromise(`python "${pythonScript}" "${escapedSql}"`);
          callback(null);
        } catch (err) {
          console.error('数据库执行失败:', err);
          callback(err);
        }
      },
      
      close: () => {}
    };
  }

  /**
   * 获取信任历史
   */
  async getTrustHistory(userHash, limit) {
    // 从数据库获取信任历史
    const db = await this.getDB();
    
    return new Promise((resolve) => {
      db.all(
        `SELECT trust_score FROM trust_history 
         WHERE user_hash = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [],
        (err, rows) => {
          if (err || !rows) {
            resolve([]);
          } else {
            resolve(rows.map(r => r.trust_score));
          }
        }
      );
    });
  }

  // 以下方法需要实际查询数据库
  async calculateConflictRate(db, userHash) {
    // TODO: 查询数据库计算冲突率
    return 0.1;
  }

  async calculateConsistency(db, userHash) {
    // TODO: 查询数据库计算一致性
    return 0.8;
  }

  async calculateNovelty(db, userHash) {
    // TODO: 查询数据库计算新颖性
    return 0.3;
  }

  async calculateReportRate(db, userHash) {
    // TODO: 查询数据库计算举报率
    return 0.05;
  }

  async calculateSemanticCoherence(db, userHash) {
    // TODO: 查询数据库计算语义连贯性
    return 0.85;
  }

  async calculateTemporalPattern(db, userHash) {
    // TODO: 查询数据库计算时序模式
    return 0.9;
  }

  async calculateCrossAgentConsistency(db, userHash) {
    // TODO: 查询数据库计算跨智能体一致性
    return 0.95;
  }
}

module.exports = BayesianTrustV10;