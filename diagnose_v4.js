const fs = require('fs');

const raw = fs.readFileSync('D:/Work/XueHanyu/hsk3_words.txt', 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

console.log('Total non-empty lines:', lines.length);

const vocab = [];
const skipped = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const rest = line.replace(/^\d+\s+/, '');
    
    let word, pos, meaning, example;
    
    let m1 = rest.match(/^\[(.+?)\]/);
    if (!m1) { skipped.push({line: lineNum, reason: 'no [word]', text: line.substring(0,100)}); continue; }
    word = m1[1].trim();
    let tail = rest.substring(m1[0].length);
    
    let m2 = tail.match(/^\[(.+?)\]/);
    if (!m2) { skipped.push({line: lineNum, reason: 'no [pos]', text: line.substring(0,100)}); continue; }
    pos = m2[1].trim();
    tail = tail.substring(m2[0].length);
    
    let m3 = tail.match(/^\[(.+?)\]/);
    if (!m3) { skipped.push({line: lineNum, reason: 'no [meaning]', text: line.substring(0,100)}); continue; }
    meaning = m3[1].trim();
    tail = tail.substring(m3[0].length);
    
    example = tail;
    if (example.startsWith('[')) example = example.substring(1);
    example = example.replace(/\]+$/, '').trim();
    
    if (word.startsWith('...') || word.startsWith('\u2026')) {
        skipped.push({line: lineNum, reason: 'starts with ...', text: line.substring(0,100)});
        continue;
    }
    
    if (!example) { skipped.push({line: lineNum, reason: 'empty example', text: line.substring(0,100)}); continue; }
    
    word = word.replace(/\s*([\u00B9\u00B2\u00B3])\s*/g, '$1');
    
    vocab.push({ w: word, p: pos, m: meaning, e: example, l: 3 });
}

console.log('Parsed:', vocab.length);
console.log('Skipped:', skipped.length);
console.log('\n=== SKIPPED LINES ===');
for (const s of skipped) {
    console.log('Line', s.line + ':', s.reason);
    console.log('  ' + s.text);
}
