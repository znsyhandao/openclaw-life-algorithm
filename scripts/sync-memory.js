// 添加一个简单的基于关键词的冲突检测
function simpleConflictDetect(newContent, existingContent) {
    const conflicts = [];
    const existingLines = existingContent.split('\n');
    const newLines = newContent.split('\n');
    
    newLines.forEach(line => {
        if (line.includes('[DECISION]') || line.includes('[FACT]')) {
            const topic = line.split(' ').slice(0, 5).join(' ');
            existingLines.forEach(exLine => {
                if (exLine.includes(topic) && exLine !== line) {
                    conflicts.push({ new: line, existing: exLine });
                }
            });
        }
    });
    return conflicts;
}