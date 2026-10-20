// Parse HSK Dynamic Composition Corpus dashboard and generate hsk_error_dict.js
// Usage: node parse_hsk_corpus.js
const fs = require('fs');

const SRC = 'C:/Users/崔艺博/Desktop/hsk_dashboard.html';
const OUT = 'D:/Work/XueHanyu/hsk_error_dict.js';

const html = fs.readFileSync(SRC, 'utf8');
const s = html.indexOf('const DATA = ');
if (s < 0) { console.error('DATA not found'); process.exit(1); }
const nl = html.indexOf('\n', s);
let arrText = html.slice(s + 'const DATA = '.length, nl).trim();
if (arrText.endsWith(';')) arrText = arrText.slice(0, -1);
const data = JSON.parse(arrText);

const isHan = ch => /[\u4e00-\u9fff]/.test(ch);
const add = (map, key, n) => map.set(key, (map.get(key) || 0) + n);

const biezi = new Map();  // wrong->right
const cuoci = new Map();  // wrong->right
const fanti = new Map();  // traditional->simplified
const cq = new Map();     // missing word
const cd = new Map();     // extra word/phrase
const cj = new Map();     // sentence pattern code

function topList(map, limit, minFreq) {
    return [...map.entries()]
        .map(([k, v]) => ({ k, v }))
        .filter(x => x.v >= minFreq)
        .sort((a, b) => b.v - a.v || a.k.localeCompare(b.k, 'zh'))
        .slice(0, limit);
}

for (const d of data) {
    let raw = d.raw || '';

    // 1) 繁体 [F X]：主文是简体，括号内是繁体/旧字
    raw = raw.replace(/([\u4e00-\u9fff])\[F([\u4e00-\u9fff])\]/g, (m, simp, trad) => {
        if (trad !== simp) add(fanti, trad + '→' + simp, 1);
        return simp;
    });
    raw = raw.replace(/\[F[^\]]*\]/g, '');

    // 2) 别字 [B X]：主文是正字，括号内是学生写的别字
    raw = raw.replace(/([\u4e00-\u9fff])\[B([\u4e00-\u9fff])\]/g, (m, right, wrong) => {
        if (wrong !== right) add(biezi, wrong + '→' + right, 1);
        return right;
    });
    raw = raw.replace(/\[B[^\]]*\]/g, '');

    // 3) 错词 {CC}/{CC2 X}：括号内是正确词，错误词在标记前
    const ccRe = /\{CC\d?([^}]{1,12})\}/g;
    let cm;
    while ((cm = ccRe.exec(raw))) {
        const right = cm[1];
        if (!right || !/^[\u4e00-\u9fff]{1,4}$/.test(right)) continue;
        let j = cm.index, cnt = 0, wrong = '';
        while (j > 0 && cnt < right.length) {
            const ch = raw[j - 1];
            if (isHan(ch)) { wrong = ch + wrong; cnt++; j--; } else break;
        }
        if (wrong && wrong !== right) add(cuoci, wrong + '→' + right, 1);
    }

    // 4) 缺词 {CQ X}
    const cqRe = /\{CQ([^}]{1,12})\}/g;
    let qm;
    while ((qm = cqRe.exec(raw))) { if (/^[\u4e00-\u9fff]{1,6}$/.test(qm[1])) add(cq, qm[1], 1); }

    // 5) 多词 {CD X}
    const cdRe = /\{CD([^}]{1,12})\}/g;
    let dm;
    while ((dm = cdRe.exec(raw))) { if (/^[\u4e00-\u9fff]{1,6}$/.test(dm[1])) add(cd, dm[1], 1); }

    // 6) 句式 {CJ...}
    const cjRe = /\{CJ[^}]{0,20}\}/g;
    let jm;
    while ((jm = cjRe.exec(raw))) { add(cj, jm[0].replace(/[{}]/g, '').slice(0, 10), 1); }
}

const bieziList = topList(biezi, 2500, 2).map(x => [x.k.split('→')[0], x.k.split('→')[1], x.v]);
const cuociList = topList(cuoci, 2500, 2).map(x => [x.k.split('→')[0], x.k.split('→')[1], x.v]);
const fantiList = topList(fanti, 4000, 1).map(x => [x.k.split('→')[0], x.k.split('→')[1], x.v]);
const cqList = topList(cq, 600, 3).map(x => [x.k, x.v]);
const cdList = topList(cd, 600, 3).map(x => [x.k, x.v]);
const cjList = topList(cj, 200, 5).map(x => [x.k, x.v]);

const out = {
    biezi: bieziList,
    cuoci: cuociList,
    fanti: fantiList,
    cq: cqList,
    cd: cdList,
    cj: cjList
};

const js = '// Auto-generated from HSK Dynamic Composition Corpus (11,337 essays). Do not edit by hand.\n' +
    'window.HSK_ERROR_DICT = ' + JSON.stringify(out) + ';\n';

fs.writeFileSync(OUT, js, 'utf8');

console.log('essays:', data.length);
console.log('biezi:', bieziList.length, 'top5:', bieziList.slice(0, 5));
console.log('cuoci:', cuociList.length, 'top5:', cuociList.slice(0, 5));
console.log('fanti:', fantiList.length, 'top5:', fantiList.slice(0, 5));
console.log('cq:', cqList.length, 'top10:', cqList.slice(0, 10));
console.log('cd:', cdList.length, 'top10:', cdList.slice(0, 10));
console.log('cj:', cjList.length, 'top10:', cjList.slice(0, 10));
const bytes = fs.statSync(OUT).size;
console.log('output bytes:', bytes, '(', (bytes / 1024).toFixed(1), 'KB )');
