// 语法分析准确率验证脚本（真实 DeepSeek API）
// 用法：node grammar_eval.js [等级]   例如 node grammar_eval.js 3 只跑 HSK3
// 每级抽样 6 个标注句（规则表修正后的正例）+ 1 句干扰句，调用 index.html 同款
// analyzeGrammarBatch 管线（语法匹配关闭思考），统计精确率/召回率。连续跑几轮看稳定性。
const fs = require('fs');

const SETTINGS = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const API_KEY = (SETTINGS.env && SETTINGS.env.API_KEY) || '';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const ONLY = process.argv[2] ? parseInt(process.argv[2], 10) : 0;

// ---------- 1. 载入语法规则（与 index.html 相同：HSK3-5 正例/反例换回来） ----------
const ALL_RULES = {};
for (let lv = 1; lv <= 5; lv++) {
    const code = fs.readFileSync('hsk' + lv + '_grammar.js', 'utf8');
    const sb = {};
    (new Function('sandbox', code + '; sandbox.rules = (typeof HSK' + lv + '_GRAMMAR_RULES !== "undefined") ? HSK' + lv + '_GRAMMAR_RULES : [];'))(sb);
    for (const r of sb.rules) { if (lv >= 3) { const t = r.pos; r.pos = r.neg; r.neg = t; } }
    ALL_RULES[lv] = sb.rules;
}
const LEVEL_MAP = {}; for (let lv = 1; lv <= 5; lv++) LEVEL_MAP[lv] = ALL_RULES[lv].map(r => r.s);
const RULE_MAPS = {}; for (let lv = 1; lv <= 5; lv++) RULE_MAPS[lv] = new Map(ALL_RULES[lv].map(r => [r.s, r]));
const grammarList = []; for (let lv = 1; lv <= 5; lv++) for (const p of LEVEL_MAP[lv]) grammarList.push({ pattern: p, level: lv });

// ---------- 2. 词汇（词性参考 + 最长词优先分词） ----------
const VOCAB_LEVEL_MAP = {};
function loadV(file, varName, lv) { try { const code = fs.readFileSync(file, 'utf8'); const sb = {}; (new Function('sandbox', code + '; sandbox.v = (typeof ' + varName + ' !== "undefined") ? ' + varName + ' : [];'))(sb); VOCAB_LEVEL_MAP[lv] = sb.v; } catch (e) { VOCAB_LEVEL_MAP[lv] = []; } }
loadV('hsk1_vocab.js', 'HSK1_VOCAB', 1); loadV('hsk2_vocab.js', 'HSK2_VOCAB', 2); loadV('hsk3_vocab.js', 'HSK3_VOCAB', 3); loadV('hsk4_vocab.js', 'HSK4_VOCAB', 4); loadV('lesxue3_vocab.js', 'LESXUE3_VOCAB', 5); loadV('lesxue3_vocab.js', 'LESXUE5_VOCAB', 6);
const ALL_WORDS = []; const seenW = new Set();
for (let lv = 1; lv <= 6; lv++) for (const v of (VOCAB_LEVEL_MAP[lv] || [])) if (v && v.w && !seenW.has(v.w)) { seenW.add(v.w); ALL_WORDS.push(v); }
ALL_WORDS.sort((x, y) => y.w.length - x.w.length);
globalThis.vocabEntryForWord = (w) => ALL_WORDS.find(v => v.w === w) || null;
globalThis.buildReadingTokens = (src) => { const out = []; let i = 0; while (i < src.length) { const ch = src[i]; if (!/[\u4e00-\u9fff]/.test(ch)) { out.push({ word: ch, start: i, end: i + 1, cls: 'punct' }); i++; continue; } let best = null; for (const v of ALL_WORDS) if (v.w.length >= 2 && src.startsWith(v.w, i)) { best = v.w; break; } if (best) { out.push({ word: best, start: i, end: i + best.length, cls: 'word' }); i += best.length; } else { out.push({ word: ch, start: i, end: i + 1, cls: 'word' }); i++; } } return out; };
globalThis.READING_TOKEN_CACHE = new Map();

// ---------- 3. 提取 index.html 管线并注入桩 ----------
const html = fs.readFileSync('index.html', 'utf8');
const a = html.indexOf('const PATTERN_PLACEHOLDER_TOKENS');
const b = html.indexOf('function buildCompactMistakePrompt', a);
if (a < 0 || b < 0) { console.error('pipeline extraction failed'); process.exit(1); }
const pipeline = html.slice(a, b).replace(/\r\n/g, '\n');
globalThis.LEVEL_MAP = LEVEL_MAP; globalThis.RULE_MAPS = RULE_MAPS; globalThis.grammarList = grammarList;
globalThis.stripForCompare = (s) => String(s || '').replace(/[^\u4e00-\u9fff0-9A-Za-z]/g, '');
globalThis.currentApiKey = () => API_KEY;
globalThis.aiFetchSignal = () => null;
globalThis.thinkingFetch = async function (body, ms) {
    const t0 = Date.now();
    const resp = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms || 240000) });
    const data = await resp.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    console.log('    [API]', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'status', resp.status, 'finish', msg && msg.finish_reason, 'content', String(msg && msg.content || '').length, 'reasoning', String(msg && msg.reasoning_content || '').length);
    return { resp, data };
};
const api = (0, eval)('(function(){ ' + pipeline + '\nreturn { analyzeGrammarBatch, extractPatternFixedChars, getCandidatePatterns }; })()');

// ---------- 4. 抽样测试集 ----------
function cleanPosSentence(raw) {
    let s = String(raw || '').trim().replace(/^\d+[.、．]\s*/, '');
    s = s.split(/[；;]/)[0].split(/\r?\n/)[0].trim();
    if (!s) return '';
    if (!/[。！？!?]$/.test(s)) s += '。';
    return s;
}
function hasFixedGroups(sentence, pattern) {
    const groups = api.extractPatternFixedChars(pattern);
    if (!groups.length) return true;
    let cur = 0;
    for (const g of groups) {
        const alts = g.split('/').map(x => x.trim()).filter(Boolean);
        let found = false;
        for (const alt of alts) { const p = sentence.indexOf(alt, cur); if (p !== -1) { cur = p + 1; found = true; break; } }
        if (!found) return false;
    }
    return true;
}
const NOISE = { 1: '我是学生。', 2: '我昨天去了商店。', 3: '她把书放在桌子上了。', 4: '虽然下雨了，但是我们还是去了公园。', 5: '他无论如何也不肯放弃。' };
function buildTestSet(lv, n) {
    const rules = ALL_RULES[lv].slice();
    const easy = rules.filter(r => api.extractPatternFixedChars(r.s).length > 0 && api.extractPatternFixedChars(r.s).every(g => g.split('/').every(x => x.length >= 2)));
    const hard = rules.filter(r => api.extractPatternFixedChars(r.s).length > 0 && api.extractPatternFixedChars(r.s).some(g => g.split('/').some(x => x.length === 1)));
    const pick = (arr, k) => { const out = []; if (!arr.length) return out; for (let i = 0; i < k; i++) out.push(arr[Math.floor(i * (arr.length - 1) / Math.max(1, k - 1))]); return out; };
    const chosen = [];
    for (const r of pick(easy, Math.ceil(n / 2)).concat(pick(hard, Math.floor(n / 2)))) {
        if (chosen.some(c => c.s === r.s)) continue;
        const sent = cleanPosSentence(r.pos);
        if (!sent || sent.length < 3 || sent.length > 40) continue;
        if (!hasFixedGroups(sent, r.s)) continue;
        chosen.push({ pattern: r.s, sentence: sent });
    }
    return chosen.slice(0, n);
}
// ---------- 4b. 离线覆盖率检查（不发 API）：全量规则正例句，目标模式能否进入 AI 候选 top16 ----------
if (process.argv[2] === '--coverage') {
    (function(){
        console.log('离线候选覆盖率检查：HSK1-5 全部规则正例句，目标模式能否进入 AI 候选 top16（不发 API）');
        let total = 0, miss = 0;
        const missList = [];
        for (let lv = 1; lv <= 5; lv++) {
            for (const r of ALL_RULES[lv]) {
                const sent = cleanPosSentence(r.pos);
                if (!sent || sent.length < 3 || sent.length > 40) continue;
                if (!hasFixedGroups(sent, r.s)) continue;
                total++;
                const raw = api.getCandidatePatterns(sent, grammarList);
                const top = raw.slice().sort(function(a, b){
                    return (b.ev - a.ev) || (b.mg - a.mg) || ((a.full ? 0 : 1) - (b.full ? 0 : 1)) || (b.level - a.level) || (a.pattern < b.pattern ? -1 : 1);
                }).slice(0, 16);
                if (!top.some(c => c.pattern === r.s)) { miss++; missList.push('HSK' + lv + ' ' + r.s + ' raw=' + raw.length + ' ← ' + sent); }
            }
        }
        console.log('有效正例 ' + total + ' 条；目标模式未进候选 ' + miss + ' 条（候选覆盖率 ' + (total ? Math.round((total - miss) / total * 100) : 0) + '%）');
        for (const m of missList) console.log('   ', m);
    })();
    process.exit(0);
}
function normPattern(p) { return String(p || '').replace(/[（(][^)）]*[)）]/g, '').replace(/\s+/g, ''); }
const POS_TAG = { 名: 'N', 动: 'V', 形: 'Adj', 副: 'Adv', 介: 'Prep', 代: 'Pron', 数: 'Num', 量: 'MW', 连: 'Conj', 助: 'Part' };

async function evalLevel(lv) {
    const cases = buildTestSet(lv, 6);
    if (!cases.length) { console.log('HSK' + lv + ': 抽样不足，跳过'); return null; }
    const blocks = cases.map(c => ({ sentence: c.sentence, candidates: api.getCandidatePatterns(c.sentence, grammarList), seg: '' }))
        .concat([{ sentence: NOISE[lv], candidates: api.getCandidatePatterns(NOISE[lv], grammarList), seg: '' }]);
    for (const bl of blocks) {
        const toks = globalThis.buildReadingTokens(bl.sentence).filter(t => /[\u4e00-\u9fff]/.test(t.word));
        bl.seg = toks.map(t => { let tag = '?'; const v = globalThis.vocabEntryForWord(t.word); if (v && v.p) tag = POS_TAG[String(v.p).slice(0, 1)] || '?'; if (tag === '?' && /^[0-9]+$/.test(t.word)) tag = 'Num'; return t.word + '(' + tag + ')'; }).join(' / ');
    }
    console.log('HSK' + lv + ' 样本：');
    for (const c of cases) console.log('   ', c.pattern, '←', c.sentence, '｜候选数', api.getCandidatePatterns(c.sentence, grammarList).length);
    const t0 = Date.now();
    const clauses = blocks.map(b=>b.sentence); const result = await api.analyzeGrammarBatch(clauses, 'medium', function(d,total){ console.log('    进度', d+'/'+total); });
    console.log('HSK' + lv + ' 耗时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
    const found = new Map();
    for (const item of (result || [])) found.set(globalThis.stripForCompare(item.sentence), (item.matches || []).map(m => m.pattern));
    let tp = 0, fp = 0, fn = 0;
    for (const c of cases) {
        const ms = found.get(globalThis.stripForCompare(c.sentence)) || [];
        if (ms.some(m => normPattern(m) === normPattern(c.pattern))) tp++;
        else { fn++; console.log('   FN:', c.pattern, 'got', JSON.stringify(ms)); }
        for (const m of ms) if (normPattern(m) !== normPattern(c.pattern)) { if (!hasFixedGroups(c.sentence, m)) { fp++; console.log('   FP:', c.pattern, 'wrong=', m); } else { console.log('   额外匹配（结构也在句中成立，不计错）:', c.pattern, 'extra=', m); } }
    }
    const noiseMs = found.get(globalThis.stripForCompare(NOISE[lv])) || [];
    if (noiseMs.length) console.log('   干扰句匹配（仅参考，不计分）:', JSON.stringify(noiseMs));
    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
    console.log('HSK' + lv + ' 结果：精确率 ' + (precision * 100).toFixed(0) + '% / 召回率 ' + (recall * 100).toFixed(0) + '%');
    return { precision, recall };
}

(async () => {
    console.log('语法分析准确率验证（deepseek-v4-pro, low 思考，每级 6 标注句 + 1 干扰句）');
    const per = {}; let sp = 0, sr = 0, n = 0;
    for (let lv = 1; lv <= 5; lv++) {
        if (ONLY && lv !== ONLY) continue;
        const r = await evalLevel(lv);
        if (r) { per[lv] = r; sp += r.precision; sr += r.recall; n++; }
    }
    console.log('==== 汇总 ====');
    for (let lv = 1; lv <= 5; lv++) if (per[lv]) console.log('HSK' + lv + ': 精确率 ' + (per[lv].precision * 100).toFixed(0) + '% / 召回率 ' + (per[lv].recall * 100).toFixed(0) + '%');
    if (n) console.log('平均：精确率 ' + (sp / n * 100).toFixed(0) + '% / 召回率 ' + (sr / n * 100).toFixed(0) + '%');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
