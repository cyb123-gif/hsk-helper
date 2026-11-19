// ============================================================================
// 有路中文 · 当前词语单页导出脚本（个人学习备份用，一次只导出当前这一个词）
//
// 使用方法：
//   1. 在浏览器里登录 https://www.yourroad.cn 并打开任意一个「词语详情页」
//      （地址形如 https://www.yourroad.cn/vocabulary/10024，或点词语进入详情）。
//   2. 按 F12 打开开发者工具 → Console（控制台）。
//   3. 把本文件全部内容复制粘贴到控制台，按回车运行。
//   4. 脚本会自动：
//      - 找到你登录会话的访问令牌（从页面内存/存储中提取，不修改任何东西）；
//      - 用网页自己的接口取回当前这个词的完整 JSON（释义/搭配/例句等，仅你账号能看到的范围）；
//      - 下载 yourroad_词汇_<id>.json 到本地，并复制到剪贴板。
//
// 注意：本脚本只导出“当前打开的这一个词”，不批量抓取、不绕过付费内容。
// ============================================================================
(() => {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const log = (...args) => console.log('%c[有路导出]', 'color:#0f766e;font-weight:bold', ...args);

    // ---------- 1. 从 URL 取当前词语 ID ----------
    function detectWordId() {
        const m = location.pathname.match(/^\/vocabulary\/([^/?#]+)/);
        if (m) return decodeURIComponent(m[1]);
        const s = location.pathname.match(/^\/static\/VOCAB[:%](\d+)/i);
        if (s) return s[1];
        const q = new URLSearchParams(location.search);
        if (q.get('wordId')) return q.get('wordId');
        return null;
    }

    // ---------- 2. 取访问令牌：先查 localStorage / sessionStorage ----------
    function tokenFromStorage() {
        for (const st of [window.localStorage, window.sessionStorage]) {
            if (!st) continue;
            for (let i = 0; i < st.length; i++) {
                let k;
                try { k = st.key(i); } catch (e) { continue; }
                if (!k) continue;
                let v;
                try { v = st.getItem(k); } catch (e) { continue; }
                if (!v || v.indexOf('accessToken') < 0) continue;
                try {
                    const o = JSON.parse(v);
                    const cands = [o, o && o.state, o && o.value];
                    for (const c of cands) {
                        if (c && typeof c.accessToken === 'string' && c.accessToken) return c.accessToken;
                    }
                } catch (e) {}
            }
        }
        return null;
    }

    // ---------- 3. 从 React fiber 树里找认证上下文（token 在内存里的情况） ----------
    function tokenFromReactTree() {
        const root = document.getElementById('root');
        if (!root) return null;
        const keys = Object.keys(root).filter((k) => k.indexOf('__reactContainer$') === 0 || k.indexOf('__reactFiber$') === 0);
        if (!keys.length) return null;
        const seen = new Set();
        const queue = [];
        const push = (n) => { if (n && !seen.has(n)) { seen.add(n); queue.push(n); } };
        for (const k of keys) push(root[k]);
        const scanObj = (o) => {
            if (!o || typeof o !== 'object') return null;
            // 上下文 Provider 的 value，或直接挂在对象上的 auth 状态
            const direct = [o, o.value];
            for (const d of direct) {
                if (d && typeof d === 'object' && typeof d.accessToken === 'string' && d.accessToken) return d.accessToken;
            }
            // React hook 链表（useState 存的 auth 对象）
            let h = o.memoizedState;
            let guard = 0;
            while (h && guard++ < 200) {
                const s = h.memoizedState;
                if (s && typeof s === 'object' && typeof s.accessToken === 'string' && s.accessToken) return s.accessToken;
                h = h.next;
            }
            return null;
        };
        let steps = 0;
        while (queue.length && steps++ < 300000) {
            const node = queue.shift();
            const found = scanObj(node.memoizedProps) || scanObj(node.memoizedState) || scanObj(node.stateNode);
            if (found) return found;
            push(node.child);
            push(node.sibling);
            push(node.return);
        }
        return null;
    }

    function findToken() {
        return tokenFromStorage() || tokenFromReactTree() || null;
    }

    // ---------- 4. 下载 / 剪贴板 ----------
    function download(name, text, mime) {
        const blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 5000);
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    }
    function fallbackCopy(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        } catch (e) {}
    }

    // ---------- 5. 主流程 ----------
    async function main() {
        const wordId = detectWordId();
        if (!wordId) {
            alert('没找到当前词语。\n请先点击进入任意一个词语的详情页（地址包含 /vocabulary/数字），再运行本脚本。');
            return;
        }
        let token = findToken();
        if (!token) {
            log('未能在内存/存储中找到访问令牌');
            alert('没有找到登录令牌。请确认：\n1. 你已经登录有路中文；\n2. 当前打开的是词语详情页。\n\n如果仍失败：刷新页面后、等词语内容完全显示出来，再运行本脚本。');
            return;
        }
        const lang = (() => { try { return localStorage.getItem('youlu-locale') || 'zh'; } catch (e) { return 'zh'; } })();
        const url = '/api/app/vocab/' + encodeURIComponent(wordId) + '?language=' + encodeURIComponent(lang);
        log('当前词语 ID：', wordId, '｜语言：', lang);
        log('请求：', url);

        let resp;
        try {
            resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                credentials: 'include'
            });
        } catch (e) {
            alert('请求失败：' + (e && e.message ? e.message : e));
            return;
        }
        if (!resp.ok) {
            alert('接口返回 ' + resp.status + '（可能是登录过期）。\n请刷新页面重新登录后再试。');
            return;
        }
        const data = await resp.json().catch(() => null);
        if (!data) { alert('接口没有返回有效 JSON。'); return; }

        const jsonText = JSON.stringify(data, null, 2);
        const word = data.word || data.text || data.title || ('id_' + wordId);
        const fileName = 'yourroad_词汇_' + String(word).replace(/[\\/:*?"<>|\s]+/g, '_') + '_' + wordId + '.json';
        download(fileName, jsonText);
        try { await copyText(jsonText); } catch (e) {}
        log('已保存：', fileName);
        alert('导出成功：\n文件已下载到浏览器下载目录，JSON 也已复制到剪贴板。\n\n本脚本只导出了当前这个词（' + word + '）。');
    }

    main().catch((e) => { console.error('[有路导出]', e); alert('导出失败：' + (e && e.message ? e.message : e)); });
})();
