const fs = require('fs');

const raw = fs.readFileSync('D:/Work/XueHanyu/hsk3_words.txt', 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

console.log('=== 格式检查：查找所有无法匹配的行 ===\n');

let ok = 0;
let bad = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rest = line.replace(/^\d+\s+/, '');
    
    // Try strict match: [word][pos][meaning][example]
    const strictMatch = rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\]\[(.+)\]$/);
    
    // Try loose match (missing [ before example)
    const looseMatch = rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\](.+)$/);
    
    if (strictMatch) {
        ok++;
    } else if (looseMatch) {
        ok++;
        console.log('⚠ 格式松散（缺 [）：行' + (i+1) + ' | ' + line.substring(0, 100));
    } else {
        bad.push({num: i+1, text: line.substring(0, 120)});
        console.log('✗ 无法解析：行' + (i+1) + ' | ' + line.substring(0, 100));
    }
}

console.log('\n=== 查找重复词 ===\n');
const seen = {};
for (let i = 0; i < lines.length; i++) {
    const rest = lines[i].replace(/^\d+\s+/, '');
    let match = rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\]\[(.+)\]$/)
             || rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\](.+)$/);
    if (!match) continue;
    let w = match[1].trim().replace(/[\s]*[\u00B9\u00B2\u00B3][\s]*/g, '').trim();
    if (w.startsWith('...')) continue;
    if (seen[w]) {
        console.log('⚠ 重复词 "' + w + '"：行' + seen[w] + ' 和 行' + (i+1));
    } else {
        seen[w] = i + 1;
    }
}

console.log('\n=== 统计 ===');
console.log('总行数:', lines.length);
console.log('格式正常:', ok);
console.log('无法解析:', bad.length);
console.log('重复词数:', Object.keys(seen).length - new Set(Object.keys(seen)).size + (()=>{let dup=0;const s={};for(let k in seen){if(s[seen[k]])dup++;s[seen[k]]=true;}return dup;})());
