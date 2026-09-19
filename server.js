// HSK 语法助手 - 一体化服务器
// 启动: node server.js
// 浏览器打开: http://localhost:3001
// 同时提供静态文件 + DeepSeek API 代理，同源无跨域问题
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/v1/chat/completions';
const GROQ_HOST = 'api.groq.com';
const GROQ_PATH = '/openai/v1/audio/transcriptions';
const GROQ_CLIENT_PATH = '/groq' + GROQ_PATH;

// 从 api-key.txt 读取 API Key
function loadApiKey() {
    const keyFile = path.join(__dirname, 'api-key.txt');
    try {
        const content = fs.readFileSync(keyFile, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) return trimmed;
        }
    } catch (e) { /* 文件不存在 */ }
    return process.env.DEEPSEEK_API_KEY || null;
}

let API_KEY = loadApiKey();

// 从 groq-key.txt 读取 Groq API Key（语音转文字，免费额度）
function loadGroqKey() {
    const keyFile = path.join(__dirname, 'groq-key.txt');
    try {
        const content = fs.readFileSync(keyFile, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) return trimmed;
        }
    } catch (e) { /* 文件不存在 */ }
    return process.env.GROQ_API_KEY || null;
}

let GROQ_API_KEY = loadGroqKey();

// MIME 类型映射
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
};

// 静态文件服务
function serveStatic(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    // 安全：防止路径穿越
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, filePath);

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// API 代理
function handleProxy(req, res) {
    if (!API_KEY) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '服务器未配置 API Key，请创建 api-key.txt' }));
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        console.log(`[API] → DeepSeek  ${new Date().toLocaleTimeString()}  ${body.length} bytes`);

        const options = {
            hostname: DEEPSEEK_HOST,
            port: 443,
            path: DEEPSEEK_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 120000
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'application/json; charset=utf-8'
            });

            let responseBody = '';
            proxyRes.on('data', chunk => { responseBody += chunk; });
            proxyRes.on('end', () => {
                console.log(`[API] ← DeepSeek  ${proxyRes.statusCode}  ${responseBody.length} bytes`);
                res.end(responseBody);
            });
        });

        proxyReq.on('error', (err) => {
            console.error('[API] 请求失败:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'API 请求失败: ' + err.message }));
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'API 请求超时' }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
}

// Groq 语音转文字代理（multipart/form-data 直接流转发）
function handleGroqProxy(req, res) {
    if (!GROQ_API_KEY) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '服务器未配置 Groq API Key，请创建 groq-key.txt 或设置环境变量 GROQ_API_KEY' }));
        return;
    }

    const options = {
        hostname: GROQ_HOST,
        port: 443,
        path: GROQ_PATH,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + GROQ_API_KEY,
            'Content-Type': req.headers['content-type'] || 'multipart/form-data',
            'Content-Length': req.headers['content-length'] || 0
        },
        timeout: 180000
    };

    const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8'
        });
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[Groq] 请求失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Groq 请求失败: ' + err.message }));
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Groq 请求超时' }));
    });

    req.pipe(proxyReq);
}

// 北语 TTS 语音合成代理（hsk.blcu.edu.cn/tts，返回音频流）
function handleTtsProxy(req, res) {
    let query = '';
    const qIndex = req.url.indexOf('?');
    if (qIndex >= 0) query = req.url.slice(qIndex + 1);
    const params = new URLSearchParams(query);
    const text = params.get('text') || '';
    if (!text) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '缺少 text 参数' }));
        return;
    }
    const speed = params.get('speed') || '5';
    const voice = params.get('voice') || '1';
    const volume = params.get('volume') || '5';
    const upstreamPath = '/tts?text=' + encodeURIComponent(text) + '&speed=' + encodeURIComponent(speed) + '&voice=' + encodeURIComponent(voice) + '&volume=' + encodeURIComponent(volume);
    const options = {
        hostname: 'hsk.blcu.edu.cn',
        port: 443,
        path: upstreamPath,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://hsk.blcu.edu.cn/'
        },
        timeout: 30000
    };
    const proxyReq = https.get(options, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'TTS 上游返回 ' + proxyRes.statusCode }));
            return;
        }
        res.writeHead(200, { 'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg' });
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
        console.error('[TTS] 请求失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'TTS 请求失败: ' + err.message }));
    });
    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'TTS 请求超时' }));
    });
}

// 新闻搜索代理（百度新闻搜索，无需 API Key，国内可访问）
function handleNewsSearchProxy(req, res) {
    let query = '';
    const qIndex = req.url.indexOf('?');
    if (qIndex >= 0) query = req.url.slice(qIndex + 1);
    const params = new URLSearchParams(query);
    const q = (params.get('q') || '').trim();
    if (!q) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '缺少 q 参数' }));
        return;
    }
    const searchPath = '/s?tn=news&word=' + encodeURIComponent(q) + '&rtt=4';
    const options = {
        hostname: 'www.baidu.com',
        port: 443,
        path: searchPath,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        },
        timeout: 20000
    };
    const proxyReq = https.get(options, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '新闻搜索上游返回 ' + proxyRes.statusCode }));
            return;
        }
        let body = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', chunk => { body += chunk; });
        proxyRes.on('end', () => {
            const items = [];
            const seen = new Set();
            const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
            // 新闻结果块：<h3 class="c-title..."> / <h3 class="news-title...">
            const h3Re = /<h3[^>]*class="[^"]*(?:c-title|news-title)[^"]*"[^>]*>([\s\S]*?)<\/h3>/g;
            let m;
            while ((m = h3Re.exec(body)) !== null && items.length < 15) {
                const inner = m[1];
                const aRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
                const am = aRe.exec(inner);
                const title = stripTags(inner);
                const link = am ? am[1].replace(/^\/\//, 'https://') : '';
                if (!title || seen.has(title)) continue;
                seen.add(title);
                // 尝试取该标题块后面的简介文本（最多向后找 800 字符内的文字）
                const tail = body.slice(m.index + m[0].length, m.index + m[0].length + 900);
                let txt = stripTags(tail).replace(/\s+/g, ' ');
                const lt = txt.indexOf('<');
                if (lt >= 0) txt = txt.slice(0, lt);
                items.push({ title, link, pubDate: '', snippet: txt.slice(0, 120) });
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ items }));
        });
    });
    proxyReq.on('error', (err) => {
        console.error('[NewsSearch] 请求失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '新闻搜索失败: ' + err.message }));
    });
    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '新闻搜索超时' }));
    });
}

// ========== HTTP 服务器 ==========
const server = http.createServer((req, res) => {
    // 新闻搜索代理
    if (req.url.startsWith('/search-news?')) {
        handleNewsSearchProxy(req, res);
        return;
    }

    // TTS 语音合成代理
    if (req.url.startsWith('/tts?')) {
        handleTtsProxy(req, res);
        return;
    }

    // API 代理
    if (req.url === DEEPSEEK_PATH && req.method === 'POST') {
        handleProxy(req, res);
        return;
    }

    // Groq 语音转文字代理
    if (req.url === GROQ_CLIENT_PATH && req.method === 'POST') {
        handleGroqProxy(req, res);
        return;
    }

    // 健康检查
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY, groq_key_configured: !!GROQ_API_KEY }));
        return;
    }

    // 重载 API Key
    if (req.url === '/reload-key' && req.method === 'POST') {
        API_KEY = loadApiKey();
        GROQ_API_KEY = loadGroqKey();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY, groq_key_configured: !!GROQ_API_KEY }));
        console.log('[Server] API Key 已重载，DeepSeek ' + (API_KEY ? '有效' : '未配置') + '，Groq ' + (GROQ_API_KEY ? '有效' : '未配置'));
        return;
    }

    // 静态文件
    serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log('='.repeat(55));
    console.log('  🎓 HSK 语法助手 · 一体化服务器');
    console.log('  📡 地址: http://localhost:' + PORT);
    console.log('  🔑 DeepSeek API Key: ' + (API_KEY ? '已配置 ✓' : '❌ 未配置！'));
    console.log('  🎙️ Groq API Key: ' + (GROQ_API_KEY ? '已配置 ✓' : '❌ 未配置（语音转文字不可用）'));
    console.log('  💡 浏览器打开 http://localhost:' + PORT + ' 即可使用');
    console.log('='.repeat(55));
});
