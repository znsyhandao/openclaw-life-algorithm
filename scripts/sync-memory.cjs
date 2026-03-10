#!/usr/bin/env node

/**
 * OpenClaw 记忆冲突检测与同步系统
 * 版本: 1.0.1 (2026-03-10) - 调试版
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ==================== 配置区域 ====================
const CONFIG = {
    MEMORY_PATH: path.join(os.homedir(), '.openclaw', 'workspace', 'MEMORY.md'),
    SOUL_PATH: path.join(os.homedir(), '.openclaw', 'workspace', 'SOUL.md'),
    CONFLICT_LOG: path.join(os.homedir(), '.openclaw', 'workspace', 'CONFLICTS.md'),
    HEARTBEAT_PATH: path.join(os.homedir(), '.openclaw', 'workspace', 'HEARTBEAT.md'),

    SIMILARITY_THRESHOLD: 0.65,
    IMPORTANCE_TAGS: ['[FACT]', '[DECISION]', '[LEARNED]', '[RULE]', '记住', '重要'],
    STOP_WORDS: new Set([
        '的', '了', '在', '是', '我', '你', '他', '她', '它',
        '我们', '你们', '他们', '这个', '那个', '这些', '那些'
    ]),

    ARGS: {
        fix: process.argv.includes('--fix'),
        verbose: process.argv.includes('--verbose'),
        help: process.argv.includes('--help')
    }
};

// ==================== 工具函数 ====================

function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levels = { 'INFO': 'ℹ️', 'WARN': '⚠️', 'ERROR': '❌', 'SUCCESS': '✅', 'DEBUG': '🔍' };
    const prefix = levels[level] || '📢';
    
    if (level === 'ERROR' || level === 'WARN' || CONFIG.ARGS.verbose) {
        console.log(`${prefix} [${timestamp}] ${message}`);
        if (data && CONFIG.ARGS.verbose) console.log(data);
    }
}

function normalizeText(text) {
    if (!text) return [];
    const cleaned = text.toLowerCase()
        .replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const words = cleaned.split(' ');
    return words.filter(w => w.length > 1 && !CONFIG.STOP_WORDS.has(w));
}

function jaccardSimilarity(text1, text2) {
    const words1 = new Set(normalizeText(text1));
    const words2 = new Set(normalizeText(text2));
    if (words1.size === 0 || words2.size === 0) return 0;
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
}

function extractTopic(text, wordCount = 3) {
    const words = normalizeText(text);
    const uniqueWords = [...new Set(words)];
    uniqueWords.sort((a, b) => b.length - a.length);
    return uniqueWords.slice(0, wordCount).join('_');
}

// ==================== 核心检测逻辑 ====================

function extractImportantEntries(filePath) {
    if (!fs.existsSync(filePath)) {
        log('WARN', `记忆文件不存在: ${filePath}`);
        return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const entries = [];
    let currentHeading = '';
    let currentTopic = '';
    
    lines.forEach((line, index) => {
        // 检测标题
        if (line.trim().startsWith('#')) {
            currentHeading = line.replace(/^#+\s*/, '').trim();
            currentTopic = currentHeading.replace(/\[[^\]]+\]\s*/, '').trim();
            
            const hasTag = CONFIG.IMPORTANCE_TAGS.some(tag => currentHeading.includes(tag));
            if (hasTag && currentHeading.length > 5) {
                entries.push({
                    line: line,
                    clean: currentHeading,
                    index: index,
                    hasTag: true,
                    isHeading: true,
                    topic: extractTopic(currentTopic)
                });
            }
        }
        
        // 检测列表项
        const listItemMatch = line.trim().match(/^[-*]\s+(.+)/);
        if (listItemMatch) {
            const itemContent = listItemMatch[1].trim();
            const hasTag = CONFIG.IMPORTANCE_TAGS.some(tag => 
                currentHeading.includes(tag) || itemContent.includes(tag)
            );
            
            if (hasTag || itemContent.length > 5) {
                entries.push({
                    line: itemContent,
                    clean: itemContent,
                    index: index,
                    hasTag: hasTag,
                    isHeading: false,
                    topic: extractTopic(currentTopic || itemContent)
                });
            }
        }
    });
    
    // 🔍 调试输出：打印所有提取到的记忆
    console.log('\n📋 提取到的记忆列表:');
    entries.forEach((e, i) => {
        console.log(`  [${i}] 话题: "${e.topic}" | 内容: "${e.clean.substring(0, 30)}${e.clean.length > 30 ? '...' : ''}"`);
    });
    console.log('');
    
    log('INFO', `从 ${filePath} 提取到 ${entries.length} 条重要记忆`);
    return entries;
}

function detectConflicts(entries) {
    const conflicts = [];
    const processed = new Set();
    
    for (let i = 0; i < entries.length; i++) {
        if (processed.has(i)) continue;
        
        const entry1 = entries[i];
        const group = [entry1];
        
        for (let j = i + 1; j < entries.length; j++) {
            const entry2 = entries[j];
            
            const similarity = jaccardSimilarity(entry1.clean, entry2.clean);
            const sameTopic = entry1.topic === entry2.topic;
            
            // 🔍 调试输出：打印每对比较结果
            if (CONFIG.ARGS.verbose) {
                console.log(`  比较 [${i}] vs [${j}]: 相同话题=${sameTopic}, 相似度=${similarity.toFixed(3)}`);
            }
            
            if ((sameTopic || similarity > CONFIG.SIMILARITY_THRESHOLD) && 
                entry1.clean !== entry2.clean) {
                group.push(entry2);
                processed.add(j);
            }
        }
        
        if (group.length > 1) {
            conflicts.push({
                topic: entry1.topic,
                similarity: jaccardSimilarity(group[0].clean, group[1].clean),
                entries: group.map(e => ({
                    text: e.line,
                    clean: e.clean,
                    index: e.index
                }))
            });
        }
    }
    
    log('INFO', `检测到 ${conflicts.length} 组冲突`);
    return conflicts;
}

function logConflicts(conflicts) {
    if (conflicts.length === 0) {
        log('SUCCESS', '未发现记忆冲突，记忆库状态良好');
        return;
    }
    
    let report = `\n## 🔥 记忆冲突检测报告 (${new Date().toLocaleString()})\n\n`;
    
    conflicts.forEach((conflict, idx) => {
        report += `### 冲突组 ${idx + 1} (相似度: ${conflict.similarity.toFixed(2)})\n`;
        report += `**话题**: ${conflict.topic}\n\n`;
        report += `**矛盾条目**:\n`;
        
        conflict.entries.forEach((entry, eidx) => {
            report += `${eidx + 1}. \`${entry.text}\`\n`;
        });
        
        report += `\n**建议裁决**: 请检查以上条目，保留正确版本。\n\n---\n\n`;
    });
    
    fs.appendFileSync(CONFIG.CONFLICT_LOG, report);
    log('WARN', `已记录 ${conflicts.length} 组冲突到 ${CONFIG.CONFLICT_LOG}`);
    
    const heartbeatNote = `\n⚠️ ${new Date().toLocaleString()} 发现 ${conflicts.length} 组记忆冲突，请查看 CONFLICTS.md 裁决。\n`;
    fs.appendFileSync(CONFIG.HEARTBEAT_PATH, heartbeatNote);
}

// ==================== 主函数 ====================

async function main() {
    console.log('\n🔍 OpenClaw 记忆冲突检测系统 v1.0');
    console.log('================================\n');
    
    if (CONFIG.ARGS.help) {
        console.log('用法: node sync-memory.cjs [选项]');
        console.log('');
        console.log('选项:');
        console.log('  --fix      尝试自动修复冲突');
        console.log('  --verbose  显示详细日志');
        console.log('  --help     显示此帮助信息');
        return;
    }
    
    if (!fs.existsSync(CONFIG.MEMORY_PATH)) {
        log('ERROR', `记忆文件不存在: ${CONFIG.MEMORY_PATH}`);
        process.exit(1);
    }
    
    const conflictDir = path.dirname(CONFIG.CONFLICT_LOG);
    if (!fs.existsSync(conflictDir)) {
        fs.mkdirSync(conflictDir, { recursive: true });
    }
    
    const entries = extractImportantEntries(CONFIG.MEMORY_PATH);
    
    if (entries.length === 0) {
        log('WARN', '未找到重要记忆条目');
        process.exit(0);
    }
    
    const conflicts = detectConflicts(entries);
    logConflicts(conflicts);
    
    console.log('\n================================');
    if (conflicts.length === 0) {
        console.log('✅ 记忆库状态健康，无冲突\n');
    } else {
        console.log(`⚠️ 检测到 ${conflicts.length} 组冲突，请查看 ${CONFIG.CONFLICT_LOG}\n`);
    }
}

if (require.main === module) {
    main().catch(err => {
        log('ERROR', '执行失败', err.message);
        process.exit(1);
    });
}