// life-epidemic/lib/mesi-protocol-v10.js
// MESI一致性协议 v10.0
// 集成：状态机 + 污染隔离 + 动态访问控制 + 可扩展验证

const crypto = require('crypto');
const logger = require('./logger');

class MESIProtocolV10 {
  constructor() {
    // MESI状态
    this.states = {
      MODIFIED: 'M',
      EXCLUSIVE: 'E',
      SHARED: 'S',
      INVALID: 'I'
    };
    
    // 扩展状态（污染标记）
    this.contamination = {
      CLEAN: 'C',
      SUSPECT: 'S',
      CONFIRMED: 'F'
    };
    
    // 访问控制级别
    this.accessLevels = {
      PRIVATE: 0,      // 仅所有者
      SHARED: 1,       // 可共享
      PUBLIC: 2        // 公开
    };
    
    // 缓存配置
    this.cache = {
      size: 1000,                // 每智能体缓存大小
      lru: new Map(),            // LRU缓存
      version: new Map()         // 版本向量
    };
    
    // 可扩展性验证
    this.scalability = {
      maxAgents: 1000,
      partitionTolerance: 0.95,
      syncInterval: 5000         // 5秒同步
    };
    
    // 污染隔离日志
    this.contaminationLog = [];
  }

  /**
   * 核心：缓存访问
   */
  async access(memoryId, agentId, operation, context) {
    const start = Date.now();
    const key = `${memoryId}:${agentId}`;
    
    // 1. 访问控制检查
    const access = await this.checkAccess(memoryId, agentId, operation);
    if (!access.allowed) {
      return { allowed: false, reason: access.reason };
    }
    
    // 2. 污染检查
    const contamination = await this.checkContamination(memoryId);
    if (contamination.level === this.contamination.CONFIRMED) {
      return { allowed: false, reason: '记忆已被污染' };
    }
    
    // 3. 获取当前状态
    let state = this.cache.lru.get(key) || {
      data: null,
      mesiState: this.states.INVALID,
      version: 0,
      owner: agentId,
      accessLevel: this.accessLevels.PRIVATE
    };
    
    // 4. 执行操作
    if (operation === 'read') {
      return await this.readOperation(memoryId, agentId, state, key);
    } else if (operation === 'write') {
      return await this.writeOperation(memoryId, agentId, state, key, context);
    } else if (operation === 'share') {
      return await this.shareOperation(memoryId, agentId, state, key, context);
    }
    
    return { allowed: false, reason: '未知操作' };
  }

  /**
   * 读操作
   */
  async readOperation(memoryId, agentId, state, key) {
    const start = Date.now();  // 添加这一行！
    
    // 如果缓存有效，直接返回
    if (state.mesiState !== this.states.INVALID && state.data) {
      // 更新LRU
      this.cache.lru.delete(key);
      this.cache.lru.set(key, state);
      
      return {
        allowed: true,
        data: state.data,
        source: 'cache',
        state: state.mesiState,
        latency: Date.now() - start
      };
    }
    
    // 从数据库读取
    const data = await this.loadFromDB(memoryId);
    if (!data) {
      return { allowed: false, reason: '记忆不存在' };
    }
    
    // 检查其他副本
    const otherCopies = await this.findOtherCopies(memoryId);
    
    if (otherCopies.length === 0) {
      // 无其他副本，进入独占状态
      state.mesiState = this.states.EXCLUSIVE;
    } else {
      // 有其他副本，进入共享状态
      state.mesiState = this.states.SHARED;
    }
    
    state.data = data;
    state.version = data.version;
    
    // 更新缓存
    this.cache.lru.set(key, state);
    
    return {
      allowed: true,
      data: data,
      source: 'database',
      state: state.mesiState,
      otherCopies: otherCopies.length,
      latency: Date.now() - start
    };
  }

  /**
   * 写操作
   */
  async writeOperation(memoryId, agentId, state, key, context) {
    const start = Date.now();  // 添加这一行！
    
    // 如果当前状态是共享，需要先无效化其他副本
    if (state.mesiState === this.states.SHARED) {
      await this.invalidateOtherCopies(memoryId, agentId);
    }
    
    // 写入数据
    const newData = context.data;
    newData.version = (state.version || 0) + 1;
    newData.modifiedBy = agentId;
    newData.modifiedAt = new Date().toISOString();
    
    // 更新状态
    state.data = newData;
    state.mesiState = this.states.MODIFIED;
    state.version = newData.version;
    state.owner = agentId;
    
    // 更新缓存
    this.cache.lru.set(key, state);
    
    // 异步写回数据库
    this.writeToDB(memoryId, newData).catch(err => {
      console.error('写回数据库失败', err);
    });
    
    return {
      allowed: true,
      version: newData.version,
      state: state.mesiState,
      latency: Date.now() - start
    };
  }
  /**
   * 共享操作
   */
  async shareOperation(memoryId, agentId, state, key, context) {
    const targetAgent = context.targetAgent;
    
    // 检查共享权限
    if (state.accessLevel < this.accessLevels.SHARED) {
      return { allowed: false, reason: '记忆不可共享' };
    }
    
    // 创建目标缓存
    const targetKey = `${memoryId}:${targetAgent}`;
    const targetState = {
      data: state.data,
      mesiState: this.states.SHARED,
      version: state.version,
      owner: agentId,
      accessLevel: state.accessLevel
    };
    
    this.cache.lru.set(targetKey, targetState);
    
    return {
      allowed: true,
      targetAgent,
      state: 'shared',
      latency: Date.now() - start
    };
  }

  /**
   * 无效化其他副本
   */
  async invalidateOtherCopies(memoryId, excludeAgent) {
    const copies = await this.findOtherCopies(memoryId, excludeAgent);
    
    for (const copy of copies) {
      const key = `${memoryId}:${copy.agentId}`;
      const state = this.cache.lru.get(key);
      if (state) {
        state.mesiState = this.states.INVALID;
        this.cache.lru.set(key, state);
      }
    }
    
    return copies.length;
  }

  /**
   * 污染检测与隔离
   */
  async detectContamination(memoryId, context) {
    const memory = await this.loadFromDB(memoryId);
    
    // 1. 检查是否被SSGM标记为异常
    if (context.ssgmResult && context.ssgmResult.decision === 'reject') {
      await this.markContaminated(memoryId, 'SSGM', context.ssgmResult);
      return true;
    }
    
    // 2. 检查信任评分
    if (context.trustScore && context.trustScore < 0.4) {
      await this.markContaminated(memoryId, 'trust', { score: context.trustScore });
      return true;
    }
    
    // 3. 检查传播模式
    const propagation = await this.analyzePropagation(memoryId);
    if (propagation.speed > 10) {  // 传播速度过快
      await this.markContaminated(memoryId, 'propagation', propagation);
      return true;
    }
    
    return false;
  }

  /**
   * 标记污染
   */
  async markContaminated(memoryId, reason, details) {
    const record = {
      memoryId,
      reason,
      details,
      timestamp: new Date().toISOString(),
      action: 'isolated'
    };
    
    this.contaminationLog.push(record);
    
    // 无效化所有副本
    const copies = await this.findOtherCopies(memoryId);
    for (const copy of copies) {
      const key = `${memoryId}:${copy.agentId}`;
      this.cache.lru.delete(key);
    }
    
    // 记录到数据库
    await this.saveContaminationRecord(record);
    
    return record;
  }

  /**
   * 分析传播模式
   */
  async analyzePropagation(memoryId) {
    const propagationHistory = await this.getPropagationHistory(memoryId);
    
    if (propagationHistory.length < 2) {
      return { speed: 0, pattern: 'normal' };
    }
    
    // 计算传播速度（每小时间隔）
    const timestamps = propagationHistory.map(h => new Date(h.timestamp).getTime());
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const speed = 3600000 / avgInterval;  // 每小时传播次数
    
    // 检测异常模式
    let pattern = 'normal';
    if (speed > 10) pattern = 'rapid';
    if (intervals.every(i => i < 60000)) pattern = 'burst';
    
    return { speed, pattern, intervals };
  }

  /**
   * 可扩展性验证
   */
  async validateScalability(agentCount) {
    if (agentCount > this.scalability.maxAgents) {
      return {
        valid: false,
        reason: `超出最大智能体数 ${this.scalability.maxAgents}`,
        suggested: '需要分片'
      };
    }
    
    // 模拟分区容错
    const partitions = Math.ceil(agentCount / 100);
    const tolerance = Math.pow(this.scalability.partitionTolerance, partitions);
    
    return {
      valid: true,
      agentCount,
      partitions,
      tolerance,
      recommended: partitions === 1 ? '单分区' : '多分区'
    };
  }

  /**
   * 同步
   */
  async sync() {
    // 定期同步缓存和数据库
    const now = Date.now();
    
    for (const [key, state] of this.cache.lru) {
      if (state.mesiState === this.states.MODIFIED) {
        // 写回数据库
        const [memoryId, agentId] = key.split(':');
        await this.writeToDB(memoryId, state.data);
        state.mesiState = this.states.SHARED;
      }
    }
  }

  // 辅助方法
  async checkAccess(memoryId, agentId, operation) {
    // 访问控制检查
    return { allowed: true };
  }

  async checkContamination(memoryId) {
    // 污染检查
    return { level: this.contamination.CLEAN };
  }

  async loadFromDB(memoryId) {
    // 从数据库加载
    return null;
  }

  async writeToDB(memoryId, data) {
    // 写入数据库
  }

  async findOtherCopies(memoryId, excludeAgent = null) {
    // 查找其他副本
    return [];
  }

  async getPropagationHistory(memoryId) {
    // 获取传播历史
    return [];
  }

  async saveContaminationRecord(record) {
    // 保存污染记录
  }
}

module.exports = MESIProtocolV10;