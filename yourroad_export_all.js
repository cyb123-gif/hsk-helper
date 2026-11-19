// ============================================================================
// 有路中文 · 「浏览记录导出」脚本（个人学习备份用）
//
// 说明：有路中文的词库数据在登录 + 付费墙后面，脚本不做批量爬取、不绕过付费内容。
// 本脚本只做一件事：你正常浏览词语详情页时，自动把「你账号已经能看到、并且你已经
// 打开过的词」的完整 JSON 记录到当前页面内存里；浏览完一批词后，一键导出全部已记录词。
//
// 使用方法：
//   1. 登录 https://www.yourroad.cn，在任意页面按 F12 → Console（控制台）；
//   2. 把本文件全部内容粘贴进控制台，回车运行（显示「开始记录」即成功）；
//   3. 像平时一样浏览词语详情页（每打开一个词，控制台会提示「已记录 xxx」）；
//   4. 浏览完一批后，再运行一次本脚本（或直接输入 window.__yrDump() 回车）；
//      会下载 yourroad_已浏览词语_N个.json 到本地，并复制到剪贴板。
//
// 注意：刷新页面后记录会清空；脚本不修改、不上传任何数据，只保存你浏览过的内容。
// ============================================================================
(() => {
    'use strict';

    const log = (...args) => console.log('%c[有路记录]', 'color:#0f766e;font-weight:bold', ...args);
    const copyText = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    };
    const fallbackCopy = (text) => {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        } catch (e) {}
    };
    const download = (name, text) => {
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 5000);
    };

    // 已启动过：直接导出
    if (window.__yrRecorder) {
        window.__yrDump();
        return;
    }

    window.__yrRecorder = { words: new Map() };

    // 记录词条：同一词只保留最后一次打开时的完整数据
    const recordWord = (data) => {
        try {
            if (!data || typeof data !== 'object') return;
            const key = data.id != null ? String(data.id)
                : (data.word || data.text || data.title || '');
            if (!key) return;
            window.__yrRecorder.words.set(key, data);
            log('已记录', key, '（累计', window.__yrRecorder.words.size, '个词）');
        } catch (e) {}
    };

    // 监听词语详情请求（GET /api/app/vocab/{id}?language=...），把返回内容记下来
    const origFetch = window.fetch;
    window.fetch = function (...args) {
        const res = origFetch.apply(this, args);
        try {
            const input = args[0];
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const m = url.match(/\/api\/app\/vocab\/([^/?#]+)\?/);
            if (m && res && typeof res.clone === 'function') {
                res.clone().json()
                    .then((data) => {
                        if (data && typeof data === 'object' && !data.status) recordWord(data);
                    })
                    .catch(() => {});
            }
        } catch (e) {}
        return res;
    };

    // 一键导出
    window.__yrDump = function () {
        const arr = Array.from(window.__yrRecorder.words.values());
        if (!arr.length) {
            alert('还没有记录到词语。\n请先正常浏览几个词语详情页（每打开一个词会自动记录），然后再运行导出。');
            return;
        }
        const text = JSON.stringify(arr, null, 2);
        const name = 'yourroad_已浏览词语_' + arr.length + '个_' + new Date().toISOString().slice(0, 10) + '.json';
        download(name, text);
        try { copyText(text); } catch (e) {}
        log('已导出', arr.length, '个词 →', name);
        alert('导出成功：已下载 ' + arr.length + ' 个浏览过的词到本地，并复制到剪贴板。');
    };

    log('开始记录：现在正常浏览词语详情页即可；再运行本脚本一次即导出全部已记录词。');
    alert('已开始记录。\n现在请像平时一样浏览词语详情页（每打开一个词会自动记录）。\n浏览完后再运行本脚本一次（或输入 window.__yrDump()），即可下载全部已记录词。');
})();
