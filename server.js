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
    // 去掉查询参数（?v=xxx 等缓存版本号），否则会被当成文件名的一部分导致 404
    const queryIdx = filePath.indexOf('?');
    if (queryIdx >= 0) filePath = filePath.substring(0, queryIdx);
    try { filePath = decodeURIComponent(filePath); } catch (e) { /* 保留原样 */ }
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
            timeout: 180000
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

// 图片搜索代理（Bing 图片搜索，无需 API Key，国内可访问）
function handleImageSearchProxy(req, res) {
    let query = '';
    const qIndex = req.url.indexOf('?');
    if (qIndex >= 0) query = req.url.slice(qIndex + 1);
    const params = new URLSearchParams(query);
    const q = (params.get('q') || '').trim();
    const aspect = (params.get('aspect') || '').trim();
    const mkt = (params.get('mkt') || 'en-US').trim();
    if (!q) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '缺少 q 参数' }));
        return;
    }
    // aspect=wide 时请求 Bing 返回横向图片；mkt=en-US 时结果更偏向英文图片（避免图片带中文文字）
    const searchPath = '/images/search?q=' + encodeURIComponent(q) + '&form=HDRSC2&mkt=' + encodeURIComponent(mkt) + (aspect === 'wide' ? '&qft=+filterui:aspect-wide' : '');
    const options = {
        hostname: 'www.bing.com',
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
            res.end(JSON.stringify({ error: '图片搜索上游返回 ' + proxyRes.statusCode }));
            return;
        }
        let body = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', chunk => { body += chunk; });
        proxyRes.on('end', () => {
            const urls = [];
            // Bing 图片结果里 murl 属性保存原图地址
            const re = /murl&quot;:&quot;(.*?)&quot;/g;
            let m;
            while ((m = re.exec(body)) !== null && urls.length < 8) {
                const u = m[1].replace(/\\u002f/g, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&');
                if (/^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
            }
            if (!urls.length) {
                // 兼容 Bing 返回纯 URL 属性的情况
                const re2 = /murl&quot;:(&quot;)?(.*?)(&quot;)?,/g;
                while ((m = re2.exec(body)) !== null && urls.length < 8) {
                    let u = m[2].replace(/\\u002f/g, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&');
                    if (u.startsWith('http')) u = u.replace(/^"/, '');
                    if (/^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ url: urls[0] || '', urls }));
        });
    });
    proxyReq.on('error', (err) => {
        console.error('[ImageSearch] 请求失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '图片搜索失败: ' + err.message }));
    });
    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '图片搜索超时' }));
    });
}

// 腾讯云语音合成密钥（可选，本地文件 tencent-keys.txt，格式：SecretId,SecretKey,AppID）
function loadTencentKeys() {
    const keyFile = path.join(__dirname, 'tencent-keys.txt');
    try {
        const content = fs.readFileSync(keyFile, 'utf-8');
        const parts = content.split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 3) return { secretId: parts[0], secretKey: parts[1], appId: parts[2] };
    } catch (e) { /* 文件不存在 */ }
    if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
        return { secretId: process.env.TENCENT_SECRET_ID, secretKey: process.env.TENCENT_SECRET_KEY };
    }
    return null;
}
let TENCENT_KEYS = loadTencentKeys();
const crypto = require('crypto');
let WebSocketServer = null;
try{ WebSocketServer = require('ws').WebSocketServer; }catch(e){ WebSocketServer = null; }
const os = require('os');
function getLanIps(){
    const out = [];
    const ifs = os.networkInterfaces();
    for(const k of Object.keys(ifs)){
        for(const it of (ifs[k] || [])){
            if(it.family === 'IPv4' && !it.internal) out.push(it.address);
        }
    }
    return out;
}

// 腾讯云语音合成代理（/tts-tencent?text=...，返回 mp3 音频）
function handleTencentTtsProxy(req, res) {
    let query = '';
    const qIndex = req.url.indexOf('?');
    if (qIndex >= 0) query = req.url.slice(qIndex + 1);
    const params = new URLSearchParams(query);
    const text = (params.get('text') || '').trim();
    if (!text) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '缺少 text 参数' }));
        return;
    }
    // 可选音色参数：腾讯云 VoiceType（默认 101001 智瑜·女），前端选择「腾讯云音色」时传入
    const voiceParam = parseInt(params.get('voice') || '101001', 10);
    const voiceType = (voiceParam >= 101001 && voiceParam <= 101051) ? voiceParam : 101001;
    const speed = params.get('speed') || '0';
    // 可选语言参数：1=中文，2=英文（腾讯云 PrimaryLanguage）
    const langParam = parseInt(params.get('lang') || '1', 10);
    const primaryLang = (langParam >= 1 && langParam <= 4) ? langParam : 1;
    if (!TENCENT_KEYS) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '服务器未配置腾讯云密钥，请创建 tencent-keys.txt（SecretId,SecretKey,AppID 一行）' }));
        return;
    }
    const host = 'tts.tencentcloudapi.com';
    const service = 'tts';
    const action = 'TextToVoice';
    const version = '2019-08-23';
    const ts = Math.floor(Date.now() / 1000);
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify({
        Text: text, SessionId: 'hsk' + Date.now(), VoiceType: voiceType, Codec: 'mp3',
        SampleRate: 16000, Speed: Number(speed) || 0, Volume: 0, ProjectId: 0, PrimaryLanguage: primaryLang
    });
    const sha256Hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
    const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest();
    const hashedPayload = sha256Hex(payload);
    const canonicalHeaders = 'content-type:application/json; charset=utf-8\nhost:' + host + '\nx-tc-action:' + action.toLowerCase() + '\n';
    const signedHeaders = 'content-type;host;x-tc-action';
    const canonicalRequest = 'POST\n/\n\n' + canonicalHeaders + '\n' + signedHeaders + '\n' + hashedPayload;
    const secretDate = hmac('TC3' + TENCENT_KEYS.secretKey, date);
    const secretService = hmac(secretDate, service);
    const secretSigning = hmac(secretService, 'tc3_request');
    const stringToSign = 'TC3-HMAC-SHA256\n' + ts + '\n' + date + '/' + service + '/tc3_request\n' + sha256Hex(canonicalRequest);
    const signature = hmac(secretSigning, stringToSign).toString('hex');
    const authorization = 'TC3-HMAC-SHA256 Credential=' + TENCENT_KEYS.secretId + '/' + date + '/' + service + '/tc3_request, SignedHeaders=' + signedHeaders + ', Signature=' + signature;
    const options = {
        hostname: host, port: 443, path: '/', method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-TC-Action': action, 'X-TC-Version': version,
            'X-TC-Timestamp': String(ts), 'X-TC-Region': 'ap-guangzhou',
            'X-TC-Language': 'zh-CN', 'Authorization': authorization,
            'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 30000
    };
    const proxyReq = https.request(options, (proxyRes) => {
        let body = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', chunk => { body += chunk; });
        proxyRes.on('end', () => {
            let json = {};
            try { json = JSON.parse(body); } catch (e) {}
            if (proxyRes.statusCode !== 200 || (json.Response && json.Response.Error)) {
                const err = json.Response && json.Response.Error;
                console.log('[TencentTTS] 腾讯云合成失败，自动改用备用语音:', (err && (err.Code + ' ' + err.Message)) || ('上游返回 ' + proxyRes.statusCode));
                handleTtsProxy(req, res);
                return;
            }
            const audioB64 = json.Response && json.Response.Audio;
            if (!audioB64) {
                console.log('[TencentTTS] 无音频返回，自动改用备用语音');
                handleTtsProxy(req, res);
                return;
            }
            const audio = Buffer.from(audioB64, 'base64');
            res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length });
            res.end(audio);
        });
    });
    proxyReq.on('error', (err) => {
        console.error('[TencentTTS] 请求失败，自动改用备用语音:', err.message);
        handleTtsProxy(req, res);
    });
    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        console.error('[TencentTTS] 请求超时，自动改用备用语音');
        handleTtsProxy(req, res);
    });
    proxyReq.write(payload);
    proxyReq.end();
}

// ========== HTTP 服务器 ==========
const server = http.createServer((req, res) => {
    // 图片搜索代理
    if (req.url.startsWith('/search-image?')) {
        handleImageSearchProxy(req, res);
        return;
    }

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

    // 腾讯云语音合成代理
    if (req.url.startsWith('/tts-tencent?')) {
        handleTencentTtsProxy(req, res);
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

// ===== 腾讯云实时语音识别 WebSocket 中转（/asr-ws）：学生浏览器 → 服务器 → 腾讯云，密钥只在服务器端 =====
function buildTencentAsrUrl(keys) {
    const host = 'asr.cloud.tencent.com';
    const ts = Math.floor(Date.now() / 1000);
    const params = {
        secretid: keys.secretId,
        timestamp: String(ts),
        expired: String(ts + 300),
        nonce: String(Math.floor(Math.random() * 1000000000)),
        voice_id: 'hsk' + Date.now() + Math.random().toString(36).slice(2, 8),
        engine_model_type: '16k_zh',
        voice_format: '1',
        needvad: '0',
        filter_dirty: '0',
        filter_modal: '0',
        filter_punc: '0',
        convert_num_mode: '1',
        word_info: '0'
    };
    const sorted = Object.keys(params).sort();
    const signStr = host + '/asr/v2/' + String(keys.appId) + '?' + sorted.map(k => k + '=' + params[k]).join('&');
    const sig = crypto.createHmac('sha1', keys.secretKey).update(signStr).digest('base64');
    const query = sorted.map(k => k + '=' + encodeURIComponent(params[k])).join('&') + '&signature=' + encodeURIComponent(sig);
    return 'wss://' + host + '/asr/v2/' + encodeURIComponent(String(keys.appId)) + '?' + query;
}
if (WebSocketServer) {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
        if (!req.url || !req.url.startsWith('/asr-ws')) return;
        if (!TENCENT_KEYS || !TENCENT_KEYS.appId) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            socket.destroy();
            return;
        }
        const upstream = new (require('ws'))(buildTencentAsrUrl(TENCENT_KEYS));
        let down = null;
        upstream.on('open', () => {
            wss.handleUpgrade(req, socket, head, (ws) => {
                down = ws;
                ws.on('message', (data, isBinary) => {
                    if (upstream.readyState === 1) { try{ upstream.send(data, { binary: isBinary }); }catch(e){} }
                });
                ws.on('close', () => { try{ upstream.close(); }catch(e){} });
                ws.on('error', () => { try{ upstream.close(); }catch(e){} });
            });
        });
        upstream.on('message', (data, isBinary) => {
            if (down && down.readyState === 1) { try{ down.send(data, { binary: isBinary }); }catch(e){} }
        });
        upstream.on('close', () => { if (down) { try{ down.close(); }catch(e){} } });
        upstream.on('error', (err) => {
            console.error('[ASR relay] 上游错误:', err.message);
            if (!down) { socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); socket.destroy(); }
            else { try{ down.close(); }catch(e){} }
        });
    });
}

server.listen(PORT, () => {
    console.log('='.repeat(55));
    console.log('  🎓 HSK 语法助手 · 一体化服务器');
    console.log('  📡 地址: http://localhost:' + PORT);
    console.log('  🔑 DeepSeek API Key: ' + (API_KEY ? '已配置 ✓' : '❌ 未配置！'));
    console.log('  🎙️ Groq API Key: ' + (GROQ_API_KEY ? '已配置 ✓' : '❌ 未配置（语音转文字不可用）'));
    console.log('  💡 浏览器打开 http://localhost:' + PORT + ' 即可使用');
    const lans = getLanIps();
    for(const ip of lans) console.log('  🌐 局域网（学生连同一 WiFi）: http://' + ip + ':' + PORT);
    console.log('='.repeat(55));
});
