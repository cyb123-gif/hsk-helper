const fs = require('fs');

const raw = fs.readFileSync('D:/Work/XueHanyu/hsk3_words.txt', 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

console.log('=== 分析所有973行 ===\n');

const vocab = [];
const problems = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rest = line.replace(/^\d+\s+/, '');
    
    // Strategy: find all [...] groups in order
    // Match: [word][pos][meaning][example]
    // But example may be missing leading [ or have extra ] at end
    
    let word, pos, meaning, example;
    
    // Try to extract word (1st bracket)
    let m1 = rest.match(/^\[(.+?)\]/);
    if (!m1) { problems.push({line: i+1, reason: 'No [word] found', text: line.substring(0,80)}); continue; }
    word = m1[1].trim();
    let after1 = rest.substring(m1[0].length);
    
    // Try pos (2nd bracket)
    let m2 = after1.match(/^\[(.+?)\]/);
    if (!m2) { problems.push({line: i+1, reason: 'No [pos] found', text: line.substring(0,80)}); continue; }
    pos = m2[1].trim();
    let after2 = after1.substring(m2[0].length);
    
    // Try meaning (3rd bracket)
    let m3 = after2.match(/^\[(.+?)\]/);
    if (!m3) { problems.push({line: i+1, reason: 'No [meaning] found', text: line.substring(0,80)}); continue; }
    meaning = m3[1].trim();
    let after3 = after2.substring(m3[0].length);
    
    // The rest is the example (may or may not start with [, may end with extra ])
    example = after3;
    // Remove leading [ if present
    if (example.startsWith('[')) example = example.substring(1);
    // Remove trailing ] if present (could be multiple like ]])
    example = example.replace(/\]+$/, '');
    example = example.trim();
    
    // Clean superscript
    word = word.replace(/[\s]*[\u00B9\u00B2\u00B3][\s]*/g, '').trim();
    
    // Skip "..." entries
    if (word.startsWith('...')) continue;
    
    if (!example) {
        problems.push({line: i+1, reason: 'Empty example', text: line.substring(0,80)});
        continue;
    }
    
    vocab.push({ w: word, p: pos, m: meaning, e: example, l: 3 });
}

console.log('Total lines:', lines.length);
console.log('Parsed words:', vocab.length);
console.log('Problems:', problems.length);

// Find duplicates
const seen = {};
const dups = [];
for (let i = 0; i < vocab.length; i++) {
    const w = vocab[i].w;
    if (seen[w] !== undefined) {
        dups.push({word: w, first: seen[w]+1, second: i+1});
    } else {
        seen[w] = i;
    }
}

console.log('\n=== 格式问题 ===');
for (const p of problems) {
    console.log('  Line', p.line + ':', p.reason, '|', p.text);
}

console.log('\n=== 重复词（共' + dups.length + '组）===');
for (const d of dups) {
    console.log('  "' + d.word + '" 出现于 #' + d.first + ' 和 #' + d.second);
}

console.log('\n总数: 原始' + lines.length + '行 -> 解析出' + vocab.length + '个词条（含重复）');

// Generate JS - keep ALL including duplicates as separate entries
let js = 'const HSK3_VOCAB = [\n';
for (const v of vocab) {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    js += `  {w:'${esc(v.w)}',p:'${esc(v.p)}',m:'${esc(v.m)}',e:'${esc(v.e)}',l:3},\n`;
}
js += '];\n';

fs.writeFileSync('D:/Work/XueHanyu/hsk3_vocab.js', js, 'utf8');
console.log('\nOutput: hsk3_vocab.js (' + vocab.length + ' entries, including duplicates)');
