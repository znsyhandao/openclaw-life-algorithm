// tests/test-audit.js
// 测试 life-validation 的记忆审计核心函数

const assert = require('assert');
const audit = require('../lib/audit');

// 辅助函数：创建测试记忆
// tests/test-audit.js
// 修改 createTestMemory 函数，确保 accessCount 被正确设置
function createTestMemory(text, daysAgo, accessCount = 1, topic = null) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  return {
    text,
    timestamp: date,
    accessCount,  // 确保这里用传入的 accessCount
    topic: topic || extractTopicSimple(text)
  };
}

// 简单的主题提取（用于测试）
function extractTopicSimple(text) {
  const match = text.match(/[\u4e00-\u9fa5]{2,}/g);
  return match ? match[0] : 'general';
}

// ==================== 测试 isStale ====================
console.log('\n🔍 测试 isStale 函数...');

// 测试1：新记忆不应过时
const newMem = createTestMemory('我喜欢吃小龙虾', 1, 5);
assert.strictEqual(audit.isStale(newMem), false, '新记忆不应过时');
console.log('  ✅ 新记忆测试通过');

// 测试2：旧记忆且访问少应过时
const oldUnusedMem = createTestMemory('我不爱吃香菜', 100, 1);
assert.strictEqual(audit.isStale(oldUnusedMem), true, '旧记忆且访问少应过时');
console.log('  ✅ 旧记忆测试通过');

// 测试3：旧记忆但访问多不应过时
console.log('\n--- 调试旧记忆但访问多 ---');
const oldUsedMem = createTestMemory('我的名字是张三', 100, 50);
console.log('创建的测试记忆:', JSON.stringify(oldUsedMem, null, 2));
const result = audit.isStale(oldUsedMem);
console.log('isStale 返回值:', result);
assert.strictEqual(result, false, '旧记忆但访问多不应过时');

// 测试4：半衰期边界测试
const halfLifeMem = createTestMemory('测试记忆', 30, 1); // 正好30天
assert.strictEqual(typeof audit.isStale(halfLifeMem), 'boolean', '半衰期边界应返回布尔值');
console.log('  ✅ 半衰期边界测试通过');

// ==================== 测试 detectConflicts ====================
console.log('\n🔍 测试 detectConflicts 函数...');

const testMemories = [
  createTestMemory('我喜欢吃小龙虾', 10, 5, '食物'),
  createTestMemory('我不喜欢吃小龙虾', 5, 2, '食物'),
  createTestMemory('我喜欢吃皮皮虾', 8, 3, '食物'),
  createTestMemory('我的名字是张三', 20, 10, '身份'),
  createTestMemory('我的名字是李四', 1, 1, '身份')
];

const conflicts = audit.detectConflicts(testMemories);
assert.strictEqual(conflicts.length >= 1, true, '应检测到至少一个冲突');
console.log(`  ✅ 检测到 ${conflicts.length} 个冲突`);
conflicts.forEach((c, i) => {
  console.log(`     冲突${i+1}: "${c.memoryA.text}" vs "${c.memoryB.text}"`);
});

// ==================== 测试 detectDrift ====================
console.log('\n🔍 测试 detectDrift 函数...');

// 创建一组有漂移的记忆
const driftMemories = [
  // 早期：正面情绪
  createTestMemory('我喜欢运动', 100, 3, '运动'),
  createTestMemory('我每天跑步', 95, 2, '运动'),
  createTestMemory('健身很有趣', 90, 1, '运动'),
  createTestMemory('我爱户外运动', 85, 2, '运动'),
  // 中期：中性
  createTestMemory('偶尔运动', 60, 1, '运动'),
  createTestMemory('运动还可以', 55, 1, '运动'),
  // 近期：负面情绪
  createTestMemory('我不想运动', 10, 5, '运动'),
  createTestMemory('运动太累了', 5, 3, '运动'),
  createTestMemory('讨厌运动', 1, 2, '运动')
];

const drifts = audit.detectDrift(driftMemories);
assert.strictEqual(drifts.length >= 1, true, '应检测到至少一个漂移');
console.log(`  ✅ 检测到 ${drifts.length} 个漂移`);
drifts.forEach((d, i) => {
  console.log(`     漂移${i+1}: 主题 "${d.topic}" 从 "${d.oldValue}" 变为 "${d.newValue}"`);
});

// ==================== 测试边界情况 ====================
console.log('\n🔍 测试边界情况...');

// 空数组
assert.deepStrictEqual(audit.detectConflicts([]), [], '空数组应返回空');
assert.deepStrictEqual(audit.detectDrift([]), [], '空数组应返回空');
console.log('  ✅ 空数组测试通过');

// 单条记忆
const singleMem = [createTestMemory('单条记忆', 1, 1)];
assert.deepStrictEqual(audit.detectConflicts(singleMem), [], '单条记忆无冲突');
assert.deepStrictEqual(audit.detectDrift(singleMem), [], '单条记忆无漂移');
console.log('  ✅ 单条记忆测试通过');

// 不足最小样本数的漂移
const fewMems = [
  createTestMemory('测试1', 10, 1, '小样本'),
  createTestMemory('测试2', 5, 1, '小样本'),
  createTestMemory('测试3', 1, 1, '小样本')
];
assert.deepStrictEqual(audit.detectDrift(fewMems), [], '样本不足应返回空');
console.log('  ✅ 小样本测试通过');

// ==================== 测试报告生成 ====================
console.log('\n🔍 测试报告生成...');

const testReport = {
  total: 10,
  stale: [createTestMemory('过时记忆1', 100, 1), createTestMemory('过时记忆2', 90, 1)],
  conflicting: [{
    id: 'conflict_test',
    memoryA: createTestMemory('喜欢A', 10, 1),
    memoryB: createTestMemory('不喜欢A', 5, 1),
    severity: 'medium'
  }],
  drifted: [{
    topic: '测试漂移',
    oldValue: '正面',
    newValue: '负面',
    score: 0.5,
    oldCount: 5,
    newCount: 3,
    examples: { old: ['旧例1'], new: ['新例1'] }
  }],
  healthy: [createTestMemory('健康记忆', 1, 10)],
  healthScore: 70
};

const formatted = audit.formatReport(testReport);
assert.strictEqual(typeof formatted, 'string', '报告应为字符串');
assert.ok(formatted.includes('📊 记忆健康报告'), '报告应包含标题');
assert.ok(formatted.includes('过时记忆'), '报告应包含过时记忆');
assert.ok(formatted.includes('冲突记忆'), '报告应包含冲突');
assert.ok(formatted.includes('偏好漂移'), '报告应包含漂移');
console.log('  ✅ 报告格式测试通过');
console.log('\n' + formatted.split('\n').slice(0, 10).join('\n') + '\n  ...');

console.log('\n🎉 所有测试通过！');