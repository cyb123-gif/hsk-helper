const fs = require('fs');

// Read the generated HSK3 vocab
const hsk3Data = fs.readFileSync('D:/Work/XueHanyu/hsk3_vocab.js', 'utf8');
const arrayMatch = hsk3Data.match(/const HSK3_VOCAB = (\[[\s\S]*\]);/);
if (!arrayMatch) { console.log('ERROR: Could not parse HSK3 vocab'); process.exit(1); }
const hsk3Array = arrayMatch[1];

// Read index.html
let html = fs.readFileSync('D:/Work/XueHanyu/index.html', 'utf8');

// 1. Insert HSK3_VOCAB array before VOCAB_LEVEL_MAP
const marker = '    const VOCAB_LEVEL_MAP = {1: HSK1_VOCAB, 3: HSK3_VOCAB};';
const newBlock = '    const HSK3_VOCAB = ' + hsk3Array + ';\n' + marker;
html = html.replace(marker, newBlock);

// 2. Update vocabViewLevel select to include HSK 3
html = html.replace(
    '<select id="vocabViewLevel">\n                    <option value="1">HSK 1</option>\n                </select>',
    '<select id="vocabViewLevel">\n                    <option value="1">HSK 1</option>\n                    <option value="3">HSK 3</option>\n                </select>'
);

fs.writeFileSync('D:/Work/XueHanyu/index.html', html, 'utf8');
console.log('Step 1 done: Inserted HSK3 vocab array and updated select.');
console.log('Now applying step 2 updates...');

// Now do the more complex replacements using regex without template literals
html = fs.readFileSync('D:/Work/XueHanyu/index.html', 'utf8');

// 3. Update renderVocabLevelProgress to show multiple levels
// Find the old function body
const oldProgress = 'const total=HSK1_VOCAB.length; let used=0; for(let [_,entry] of vocabUsedMap.entries()){ if(!isVocabAcquired(entry)) used++; } const percent=total===0?0:(used/total*100).toFixed(1); el.innerHTML=`<div class="level-row" style="cursor:pointer;"><span>HSK 1 词汇</span><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${percent}%;background:#1565c0;"></div></div><span>${used}/${total}</span></div>`; el.querySelector(\'.level-row\').addEventListener(\'click\',()=>openVocabDetailModal());';

const newProgress = 'let html2=\'\'; for(let lv of[1,3]){ const words=VOCAB_LEVEL_MAP[lv]||[]; const total2=words.length; let used2=0; for(let [_,entry] of vocabUsedMap.entries()){ if(!isVocabAcquired(entry)&&entry.level===lv) used2++; } const percent2=total2===0?0:(used2/total2*100).toFixed(1); html2+=`<div class="level-row" style="cursor:pointer;" data-level="${lv}"><span>HSK ${lv} 词汇</span><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${percent2}%;background:#1565c0;"></div></div><span>${used2}/${total2}</span></div>`; } el.innerHTML=html2; el.querySelectorAll(\'.level-row\').forEach(r=>r.addEventListener(\'click\',()=>openVocabDetailModal()));';

html = html.replace(oldProgress, newProgress);

// 4. Update analyzeVocabBatch to include HSK3 words
html = html.replace(
    'const activeWords=HSK1_VOCAB.filter(v=>{',
    'const allVocab=[...HSK1_VOCAB,...HSK3_VOCAB]; const activeWords=allVocab.filter(v=>{'
);

// 5. Update generateVocabPractice to find words across levels
html = html.replace(
    'const v=HSK1_VOCAB.find(x=>x.w===word);',
    'const v=(HSK1_VOCAB.find(x=>x.w===word)||HSK3_VOCAB.find(x=>x.w===word));'
);

// 6. Update mergeVocabResults 
html = html.replace(
    'const v=HSK1_VOCAB.find(x=>x.w===w); vocabUsedMap.set(w,{count:1, correctCount:1, level:v?v.l:1,',
    'const v=(HSK1_VOCAB.find(x=>x.w===w)||HSK3_VOCAB.find(x=>x.w===w)); vocabUsedMap.set(w,{count:1, correctCount:1, level:v?v.l:1,'
);

fs.writeFileSync('D:/Work/XueHanyu/index.html', html, 'utf8');
console.log('All done! HSK3 vocabulary fully integrated.');
