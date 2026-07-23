const fs = require('fs');

let html = fs.readFileSync('D:/Work/XueHanyu/index.html', 'utf8');

// ============ 1. Add vocab HTML before the closing </div> of info-panel ============
// Find the downloadGrammarBtn to locate the right area in info-panel
// The current file has different HTML structure. Let me find the right anchor.

// Find the info-panel end and grammar card area
const trackListIdx = html.indexOf('id="trackList"');
const grammarCardEnd = html.indexOf('</div>', html.indexOf('downloadGrammarBtn'));

// Actually, let me find the right place to insert vocab cards.
// Look for the closing of info-panel's last card before </div> of info-panel
// The info-panel ends with: </div> (close info-panel) then </div> (close app)

// Find the end of mistake/favorite card section
const favBtnIdx = html.indexOf('id="downloadFavBtn"');
if (favBtnIdx < 0) { console.log('ERROR: cannot find downloadFavBtn'); process.exit(1); }

// Find the closing </div> after the favorite card
let searchFrom = favBtnIdx;
let divCount = 0;
let insertIdx = -1;
// Navigate: after downloadFavBtn button, close the card div, then we need to add new cards
// Structure: <button id="downloadFavBtn" ...>...</button>
//            </div>  ← close card
//            </div>  ← close info-panel  
// We want to insert BEFORE the close of info-panel

// Simpler approach: find </div> of info-panel
const infoPanelEnd = html.indexOf('</div>', html.indexOf('class="info-panel"'));
// Actually let me find the app closing div
const appEnd = html.lastIndexOf('</div>') - 20; // rough

// Let me use a different strategy. Find the modal divs and insert before them.
const grammarModalIdx = html.indexOf('id="grammarModal"');
if (grammarModalIdx < 0) { console.log('ERROR: cannot find grammarModal'); process.exit(1); }

// Go backwards from grammarModal to find the closing of info-panel
let scanIdx = grammarModalIdx;
while (scanIdx > 0) {
    scanIdx--;
    if (html.substring(scanIdx, scanIdx + 6) === '</div>') {
        // Check if this is the info-panel closing
        const before = html.substring(scanIdx - 200, scanIdx);
        if (before.includes('class="info-panel"') || before.includes('downloadFavBtn')) {
            insertIdx = scanIdx;
            break;
        }
    }
}

if (insertIdx < 0) { console.log('ERROR: cannot find insert point'); process.exit(1); }

const vocabHTML = `
        <div class="card">
            <div class="stat-title">📝 词汇掌握进度</div>
            <div class="progress-grid" id="vocabLevelProgress"></div>
        </div>

        <div class="card">
            <div class="stat-title">📖 词语库分组展示（点击即练）</div>
            <div class="grammar-view-selector">
                <select id="vocabViewLevel">
                    <option value="1">HSK 1</option>
                    <option value="3">HSK 3</option>
                </select>
            </div>
            <div id="vocabLibraryList" class="grammar-list-container">加载中...</div>
        </div>

        <div class="card">
            <div class="stat-title">📋 词汇追踪</div>
            <div id="vocabTrackList" class="track-list">暂无词汇</div>
            <button id="downloadVocabBtn" class="btn" style="background:#27ae60; color:white; border:none;">⬇️ 下载词汇追踪报告</button>
        </div>
`;

html = html.substring(0, insertIdx) + vocabHTML + html.substring(insertIdx);

// ============ 2. Insert HSK1_VOCAB and updated VOCAB_LEVEL_MAP ============
const exampleEnd = 'for(let p of HSK5_RAW) EXAMPLE_MAP.set(p, HSK5_EXAMPLES[p] || "彼此都不认识");';
const afterExample = html.indexOf(exampleEnd);
if (afterExample < 0) { console.log('ERROR: cannot find example end'); process.exit(1); }
const insertPoint2 = afterExample + exampleEnd.length;

// Read HSK1_VOCAB from the hsk3_words.txt? No, I need the original HSK1 vocab data.
// Let me read it from the backup if available, or recreate it.
// Actually, I have the HSK1_VOCAB content from my initial read. Let me include it inline.

// For now, insert placeholder and we'll add it separately
const hs1VocabStart = '\n    // ==================== HSK1 词汇表（504条） ====================\n';
// This is going to be very large. Let me generate it from scratch.

// Hmm, I don't have the HSK1_VOCAB data stored anywhere now.
// Let me check if we have it in a previous version.
// The original file is lost. But I read it at the beginning - I know the format.

// Let me instead use a different approach: write a complete reconstruction
// that adds everything at once.

console.log('Vocab HTML inserted at position', insertIdx);
console.log('Now need to add HSK1_VOCAB array and vocab JS functions');

// Write intermediate result
fs.writeFileSync('D:/Work/XueHanyu/index.html', html, 'utf8');
console.log('Partial update done. Next: add vocab data and JS functions.');
