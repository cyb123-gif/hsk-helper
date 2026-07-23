const fs = require('fs');

const raw = fs.readFileSync('D:/Work/XueHanyu/hsk3_words.txt', 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

const vocab = [];
const skipped = [];

for (const line of lines) {
    const rest = line.replace(/^\d+\s+/, '');
    
    // Try strict match first: [word][pos][meaning][example]
    let match = rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\]\[(.+)\]$/);
    
    if (!match) {
        // Try loose match: look for 4 bracket groups in sequence
        // Some lines are missing opening [ before example, like:
        // [进展][动][make progress]工作有进展了吗？]
        match = rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\](.+)$/);
        if (match) {
            // The last group is raw, strip trailing ]
            let example = match[4].replace(/\]$/, '');
            let word = match[1].trim();
            let pos = match[2].trim();
            let meaning = match[3].trim();
            
            // Remove superscript
            word = word.replace(/[\s]*[\u00B9\u00B2\u00B3\u2070\u2074-\u2079]+[\s]*/g, '').trim();
            if (word.startsWith('...')) continue;
            
            // Check if this word already exists (keep first one with better format)
            const existing = vocab.find(v => v.w === word);
            if (!existing) {
                vocab.push({ w: word, p: pos, m: meaning, e: example, l: 3 });
            }
            continue;
        }
        
        skipped.push(line.trim().substring(0, 120));
        continue;
    }
    
    let word = match[1].trim();
    const pos = match[2].trim();
    const meaning = match[3].trim();
    let example = match[4].trim();
    
    // Clean trailing brackets
    example = example.replace(/\]$/, '');
    
    // Remove superscript
    word = word.replace(/[\s]*[\u00B9\u00B2\u00B3\u2070\u2074-\u2079]+[\s]*/g, '').trim();
    
    // Skip pattern entries
    if (word.startsWith('...')) continue;
    
    // Skip duplicates (keep first)
    if (vocab.find(v => v.w === word)) continue;
    
    vocab.push({ w: word, p: pos, m: meaning, e: example, l: 3 });
}

console.log('Total lines:', lines.length);
console.log('Parsed:', vocab.length);
console.log('Skipped:', skipped.length);
for (const s of skipped) console.log('  SKIP:', s);

// Generate JS
let js = 'const HSK3_VOCAB = [\n';
for (const v of vocab) {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    js += `  {w:'${esc(v.w)}',p:'${esc(v.p)}',m:'${esc(v.m)}',e:'${esc(v.e)}',l:3},\n`;
}
js += '];\n';

fs.writeFileSync('D:/Work/XueHanyu/hsk3_vocab.js', js, 'utf8');
console.log('Output written to hsk3_vocab.js');
