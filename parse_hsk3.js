const fs = require('fs');

const raw = fs.readFileSync('D:/Work/XueHanyu/hsk3_words.txt', 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

const vocab = [];

for (const line of lines) {
    // Format: number [word][pos][meaning][example]
    // Remove leading number and space
    const rest = line.replace(/^\d+\s+/, '');
    
    // Match [word][pos][meaning][example]
    const match = rest.match(/^\[(.+?)\]\[(.+?)\]\[(.+?)\]\[(.+)\]$/);
    if (!match) {
        console.log('SKIP:', line.substring(0, 80));
        continue;
    }
    
    let word = match[1].trim();
    const pos = match[2].trim();
    const meaning = match[3].trim();
    const example = match[4].trim();
    
    // Handle superscript: "把 ¹" -> "把", "为 ¹" -> "为"
    // But keep as-is for now since we need unique keys
    // Actually, let's remove superscript numbers and handle duplicates
    
    // Remove superscript numbers like ¹ ² and spaces around them
    word = word.replace(/[\s]*[\u00B9\u00B2\u00B3\u2070\u2074-\u2079]+[\s]*/g, '').trim();
    
    // Skip entries that start with "..." (like "... 极了")
    if (word.startsWith('...')) continue;
    
    vocab.push({
        w: word,
        p: pos,
        m: meaning,
        e: example,
        l: 3
    });
}

// Remove duplicates (keep first occurrence)
const seen = new Set();
const unique = [];
for (const v of vocab) {
    if (!seen.has(v.w)) {
        seen.add(v.w);
        unique.push(v);
    }
}

// Generate JS code
let js = 'const HSK3_VOCAB = [\n';
for (const v of unique) {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    js += `  {w:'${esc(v.w)}',p:'${esc(v.p)}',m:'${esc(v.m)}',e:'${esc(v.e)}',l:3},\n`;
}
js += '];\n';

fs.writeFileSync('D:/Work/XueHanyu/hsk3_vocab.js', js, 'utf8');
console.log(`Parsed ${unique.length} unique HSK3 words. Output to hsk3_vocab.js`);
