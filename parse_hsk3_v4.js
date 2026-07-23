const fs = require('fs');

const raw = fs.readFileSync('D:/Work/XueHanyu/hsk3_words.txt', 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

console.log('=== 最终解析（保留上标+去重） ===\n');

const vocab = [];
let skipped = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rest = line.replace(/^\d+\s+/, '');
    
    let word, pos, meaning, example;
    
    // Extract 3 bracket groups sequentially, rest is example
    let m1 = rest.match(/^\[(.+?)\]/);
    if (!m1) { console.log('SKIP line '+(i+1)+': no word bracket'); skipped++; continue; }
    word = m1[1].trim();
    let tail = rest.substring(m1[0].length);
    
    let m2 = tail.match(/^\[(.+?)\]/);
    if (!m2) { console.log('SKIP line '+(i+1)+': no pos bracket'); skipped++; continue; }
    pos = m2[1].trim();
    tail = tail.substring(m2[0].length);
    
    let m3 = tail.match(/^\[(.+?)\]/);
    if (!m3) { console.log('SKIP line '+(i+1)+': no meaning bracket'); skipped++; continue; }
    meaning = m3[1].trim();
    tail = tail.substring(m3[0].length);
    
    // Rest is example - remove leading [ if present, remove trailing ]
    example = tail;
    if (example.startsWith('[')) example = example.substring(1);
    example = example.replace(/\]+$/, '').trim();
    
    // Skip ... entries
    if (word.startsWith('...')) continue;
    
    if (!example) { console.log('SKIP line '+(i+1)+': empty example'); skipped++; continue; }
    
    // Clean superscript: collapse "把 ¹" to "把¹" (no space)
    word = word.replace(/\s*([\u00B9\u00B2\u00B3])\s*/g, '$1');
    
    vocab.push({ w: word, p: pos, m: meaning, e: example, l: 3 });
}

console.log('Total lines:', lines.length);
console.log('Parsed:', vocab.length);
console.log('Skipped:', skipped);

// Show duplicates
const counts = {};
for (const v of vocab) {
    counts[v.w] = (counts[v.w] || 0) + 1;
}
const dups = Object.entries(counts).filter(([k,c]) => c > 1);
if (dups.length > 0) {
    console.log('\n重复词（保留全部）：');
    for (const [w, c] of dups) {
        console.log('  "' + w + '" ×' + c);
    }
}

// Generate JS
let js = 'const HSK3_VOCAB = [\n';
for (const v of vocab) {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    js += `  {w:'${esc(v.w)}',p:'${esc(v.p)}',m:'${esc(v.m)}',e:'${esc(v.e)}',l:3},\n`;
}
js += '];\n';

fs.writeFileSync('D:/Work/XueHanyu/hsk3_vocab.js', js, 'utf8');
console.log('\nDone: hsk3_vocab.js');
