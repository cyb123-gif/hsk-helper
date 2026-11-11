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
    let filePath = req.url;
    // 去掉查询参数（?v=xxx 等缓存版本号），否则会被当成文件名的一部分导致 404
    const queryIdx = filePath.indexOf('?');
    if (queryIdx >= 0) filePath = filePath.substring(0, queryIdx);
    if (filePath === '' || filePath === '/') filePath = '/index.html';
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
        // 自动去掉用户可能多带的【】[]()等符号，再按逗号拆分
        const parts = content.split(/[\s,，;；]+/)
            .map(s => s.replace(/[【】\[\]()（）「」"'`]/g, '').trim())
            .filter(Boolean);
        // 校验格式：第三个值 AppID 必须是纯数字、SecretKey 不能太短，避免把错误内容当密钥使用
        if (parts.length >= 3 && /^\d{4,12}$/.test(parts[2]) && parts[1].length >= 8) {
            return { secretId: parts[0], secretKey: parts[1], appId: parts[2] };
        }
        console.log('[TencentKeys] tencent-keys.txt 格式不正确（应为一行三个值：SecretId,SecretKey,AppID），腾讯云语音暂不可用');
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

// ===== 腾讯云语音合成（TextToVoice）公共部分 =====
// 基础合成单次上限：150 个汉字 / 500 个字母。长文本切成小段（汉字按 1、其他字符按 0.35 估算），
// 尽量在标点处断句，逐段合成后拼接 mp3（mp3 帧可直接拼接播放）。
function ttsTextUnits(text) {
    let u = 0;
    for (const ch of String(text || '')) {
        u += /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1 : 0.35;
    }
    return u;
}
function splitTtsText(text) {
    const t = String(text || '').trim();
    const chunks = [];
    let start = 0;
    while (start < t.length) {
        let end = Math.min(t.length, start + 330);
        while (end > start + 1 && ttsTextUnits(t.slice(start, end)) > 110) end--;
        const slice = t.slice(start, end);
        let cut = -1;
        for (let i = slice.length - 1; i >= Math.floor(slice.length * 0.35); i--) {
            if ('。！？；，、：,.!?;:…'.indexOf(slice[i]) >= 0) { cut = i; break; }
        }
        if (cut > 0) end = start + cut + 1;
        const part = t.slice(start, end).trim();
        if (part) chunks.push(part);
        start = end;
    }
    return chunks;
}

// 单次合成一段文本（TC3-HMAC-SHA256 签名）。cb(err, mp3Buffer)
function tencentTtsOnce(keys, text, voiceType, speed, lang, cb) {
    const host = 'tts.tencentcloudapi.com';
    const service = 'tts';
    const action = 'TextToVoice';
    const version = '2019-08-23';
    const ts = Math.floor(Date.now() / 1000);
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify({
        Text: text, SessionId: 'hsk' + Date.now() + Math.random().toString(36).slice(2, 8),
        VoiceType: voiceType, Codec: 'mp3', SampleRate: 16000,
        Speed: Number(speed) || 0, Volume: 0, ProjectId: 0, PrimaryLanguage: lang
    });
    const sha256Hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
    const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest();
    const hashedPayload = sha256Hex(payload);
    const canonicalHeaders = 'content-type:application/json; charset=utf-8\nhost:' + host + '\nx-tc-action:' + action.toLowerCase() + '\n';
    const signedHeaders = 'content-type;host;x-tc-action';
    const canonicalRequest = 'POST\n/\n\n' + canonicalHeaders + '\n' + signedHeaders + '\n' + hashedPayload;
    const secretDate = hmac('TC3' + keys.secretKey, date);
    const secretService = hmac(secretDate, service);
    const secretSigning = hmac(secretService, 'tc3_request');
    const stringToSign = 'TC3-HMAC-SHA256\n' + ts + '\n' + date + '/' + service + '/tc3_request\n' + sha256Hex(canonicalRequest);
    const signature = hmac(secretSigning, stringToSign).toString('hex');
    const authorization = 'TC3-HMAC-SHA256 Credential=' + keys.secretId + '/' + date + '/' + service + '/tc3_request, SignedHeaders=' + signedHeaders + ', Signature=' + signature;
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
                cb(new Error((err && (err.Code + ' ' + err.Message)) || ('上游返回 ' + proxyRes.statusCode)));
                return;
            }
            const audioB64 = json.Response && json.Response.Audio;
            if (!audioB64) { cb(new Error('腾讯云未返回音频')); return; }
            cb(null, Buffer.from(audioB64, 'base64'));
        });
    });
    proxyReq.on('error', (err) => cb(err));
    proxyReq.on('timeout', () => { proxyReq.destroy(); cb(new Error('腾讯云请求超时')); });
    proxyReq.write(payload);
    proxyReq.end();
}

// 长文本分片合成，拼接为一段 mp3。cb(err, mp3Buffer)
function tencentTtsMulti(keys, text, voiceType, speed, lang, cb) {
    const chunks = splitTtsText(text);
    if (!chunks.length) { cb(new Error('缺少 text 参数')); return; }
    const parts = [];
    let finished = false;
    const next = (i) => {
        if (finished) return;
        if (i >= chunks.length) { finished = true; cb(null, Buffer.concat(parts)); return; }
        tencentTtsOnce(keys, chunks[i], voiceType, speed, lang, (err, buf) => {
            if (err) { finished = true; cb(err); return; }
            parts.push(buf);
            next(i + 1);
        });
    };
    next(0);
}

function sendTtsAudio(res, err, audio) {
    if (err) {
        console.log('[TencentTTS] 合成失败:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length });
    res.end(audio);
}

function parseTtsParams(params) {
    const text = (params.get('text') || '').trim();
    // 可选音色参数：腾讯云 VoiceType（默认 101001 智瑜·女），前端选择「腾讯云音色」时传入
    const voiceParam = parseInt(params.get('voice') || '101001', 10);
    const voiceType = (voiceParam >= 101001 && voiceParam <= 101051) ? voiceParam : 101001;
    const speed = params.get('speed') || '0';
    // 可选语言参数：1=中文，2=英文（腾讯云 PrimaryLanguage）
    const langParam = parseInt(params.get('lang') || '1', 10);
    const primaryLang = (langParam >= 1 && langParam <= 4) ? langParam : 1;
    return { text, voiceType, speed, primaryLang };
}

// ========== 微软 Edge TTS 代理（/tts-edge?text=...&voice=...&rate=...） ==========
// 浏览器 WebSocket 握手无法带桌面版 Edge 的 User-Agent，容易被微软 DRM 拒绝；
// 服务器直连 Bing 合成（Sec-MS-GEC v2 算法与 edge-tts 7.x 一致），任何浏览器都能稳定朗读。
const EDGE_TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_SEC_GEC_VERSION = '2-143.0.3650.75';
const EDGE_TTS_WSS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const EDGE_TTS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0';
const EDGE_TTS_ALLOWED_VOICES = new Set([
    'zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-YunyangNeural', 'zh-CN-XiaoyiNeural', 'zh-CN-YunjianNeural',
    'en-US-AriaNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural', 'ja-JP-NanamiNeural', 'ja-JP-KeitaNeural',
    'ko-KR-SunHiNeural', 'ko-KR-InJoonNeural', 'es-ES-ElviraNeural', 'fr-FR-DeniseNeural', 'de-DE-KatjaNeural',
    'ru-RU-SvetlanaNeural', 'th-TH-PremwadeeNeural', 'it-IT-ElsaNeural', 'vi-VN-HoaiMyNeural', 'id-ID-GadisNeural', 'sk-SK-ViktoriaNeural'
]);
const EDGE_SHA256_INITIAL = [0x6A09E667,0xBB67AE85,0x3C6EF372,0xA54FF53A,0x510E527F,0x9B05688C,0x1F83D9AB,0x5BE0CD19];
const EDGE_SHA256_STATE   = [0xFD9FBEA2,0x91243CE7,0xBE499094,0xCD2E1E0A,0x6C006F49,0x04BD35AB,0xFEB0A7E4,0x03EFFBD2];
const EDGE_SHA256_SCHEDULE= [0xEB24BF9E,0x1558691F,0xA0C09EE2,0x0CFA32BA,0xA622EE8C,0xD1DD9491,0xC0DD25A0,0xF9E70AB6,0xF0C31573,0x7058CE4E,0x7188E606,0x00E5AB33,0xD258B060,0x72766564];
const EDGE_SHA256_K = [0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0x0FC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x06CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2];
const EDGE_SHA256_ADJUSTMENT = 0xC9DC06A7;
const EDGE_SHA256_K_BLOCK = EDGE_SHA256_K.slice(0,14).concat([EDGE_SHA256_ADJUSTMENT]).concat(EDGE_SHA256_K.slice(15));
const EDGE_SIGMA0_ADJ = 0x059C0B80;
const EDGE_SIGMA1_ADJ = 0x000B92C0;
const EDGE_CS64_COEFFICIENTS = [
    [0xE82E91B1,0xB32700D0],[0x44DE24C6,0x88DFF51D],[0x3BEB65BC,0x29514038],[0xC89C5933,0xB328CBDF],
    [0x8D1EC211,0xD405B4D5],[0x314EF5D5,0x26E55F3C],[0xE92491B1,0x607801C6],[0xF0A5B9D5,0x82B2C1FB],
    [0x06064CF3,0xFA51A3DA],[0xDA79FA60,0x207CC464],[0xBED20560,0x3C3C74F3],[0x89F9C9F8,0xD2D14B61],
    [0x35FA38C6,0xBB04A2C1],[0xCB49E3C6,0xC5626167]
];
const EDGE_CS64_FACTOR = 0x82893933;
const EDGE_CS64_ADJ0 = 0xF2F90B1A;
const EDGE_CS64_ADJ1 = 0x0B1A0000;

function edgeRol16(v){ v >>>= 0; return ((v << 16) | (v >>> 16)) >>> 0; }
function edgeRotr(x, n){ return ((x >>> n) | (x << (32 - n))) >>> 0; }
function edgeSigma0(v){ return (edgeRotr(v, 7) ^ edgeRotr(v, 18) ^ (v >>> 3)) >>> 0; }
function edgeSigma1(v){ return (edgeRotr(v, 17) ^ edgeRotr(v, 19) ^ (v >>> 10)) >>> 0; }
function edgeSha256Rounds(state, words, firstRound, K){
    let a=state[0],b=state[1],c=state[2],d=state[3],e=state[4],f=state[5],g=state[6],h=state[7];
    for(let i=firstRound;i<64;i++){
        const S1 = (edgeRotr(e,6) ^ edgeRotr(e,11) ^ edgeRotr(e,25))>>>0;
        const ch = ((e&f)^((~e)&g))>>>0;
        const t1 = (h + S1 + ch + K[i] + words[i])>>>0;
        const S0 = (edgeRotr(a,2) ^ edgeRotr(a,13) ^ edgeRotr(a,22))>>>0;
        const maj = ((a&b)^(a&c)^(b&c))>>>0;
        const t2 = (S0 + maj)>>>0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    return [a,b,c,d,e,f,g,h];
}
function edgeExpandSchedule(words, firstWord){
    for(let i=firstWord;i<64;i++){
        const x = words[i-2], y = words[i-15];
        const s1 = (edgeRotr(x,17) ^ edgeRotr(x,19) ^ (x >>> 10))>>>0;
        const s0 = (edgeRotr(y,7) ^ edgeRotr(y,18) ^ (y >>> 3))>>>0;
        words.push((s1 + words[i-7] + s0 + words[i-16])>>>0);
    }
}
function edgeSha256Init(data7){
    const words = new Array(14).fill(0);
    words[14] = ((data7[0]<<16)|(data7[1]<<8)|data7[2])>>>0;
    words[15] = (((data7[3]<<24)|(data7[4]<<16)|(data7[5]<<8)|data7[6])>>>0);
    for(let index=16;index<30;index++){
        let value = EDGE_SHA256_SCHEDULE[index-16];
        if(index-2>=14) value += (index===16) ? (edgeSigma1(words[index-2]) ^ EDGE_SIGMA1_ADJ) : edgeSigma1(words[index-2]);
        if(index-7>=14) value += words[index-7];
        if(index-15>=14) value += (index===29) ? (edgeSigma0(words[index-15]) ^ EDGE_SIGMA0_ADJ) : edgeSigma0(words[index-15]);
        words.push(value>>>0);
    }
    words.push((edgeSigma1(words[28]) + words[23] + edgeSigma0(words[15]) + words[14] + EDGE_SHA256_ADJUSTMENT - EDGE_SHA256_K[14])>>>0);
    edgeExpandSchedule(words, 31);
    const working = edgeSha256Rounds(EDGE_SHA256_STATE, words, 14, EDGE_SHA256_K_BLOCK);
    const out = [];
    for(let i=0;i<8;i++) out.push((EDGE_SHA256_INITIAL[i] + working[i])>>>0);
    return out;
}
function edgeSha256Digest(data){
    if(data.length < 7) throw new Error('token salt too short');
    const length = 57 + data.length;
    const padZeros = ((55 - length) % 64 + 64) % 64;
    const paddedLen = (data.length - 7) + 1 + padZeros + 8;
    const padded = new Uint8Array(paddedLen);
    padded.set(data.subarray(7));
    padded[data.length - 7] = 0x80;
    const dvp = new DataView(padded.buffer);
    dvp.setUint32(paddedLen - 8, Math.floor((length * 8) / 0x100000000));
    dvp.setUint32(paddedLen - 4, (length * 8) >>> 0);
    let state = edgeSha256Init(data.subarray(0, 7));
    for(let off=0; off<padded.length; off+=64){
        const words = [];
        const dvb = new DataView(padded.buffer, padded.byteOffset + off, 64);
        for(let i=0;i<16;i++) words.push(dvb.getUint32(i*4));
        edgeExpandSchedule(words, 16);
        const working = edgeSha256Rounds(state, words, 0, EDGE_SHA256_K);
        state = state.map((v,i)=>(v + working[i])>>>0);
    }
    const out = new Uint8Array(32);
    const dvo = new DataView(out.buffer);
    for(let i=0;i<8;i++) dvo.setUint32(i*4, state[i]);
    return out;
}
function edgeCs64Digest(data, digest){
    const keyA = ((digest[0] | (digest[1]<<8) | (digest[2]<<16) | (digest[3]<<24)) >>> 0) | 1;
    const keyB = ((digest[4] | (digest[5]<<8) | (digest[6]<<16) | (digest[7]<<24)) >>> 0) | 1;
    const factors = [Math.imul(keyA, EDGE_CS64_FACTOR)>>>0, Math.imul(keyB, EDGE_CS64_FACTOR)>>>0];
    const terms = [], offsets = [];
    for(let i=0;i<EDGE_CS64_COEFFICIENTS.length;i++){
        terms.push(Math.imul(EDGE_CS64_COEFFICIENTS[i][0], factors[i%2])>>>0);
        offsets.push(EDGE_CS64_COEFFICIENTS[i][1]);
    }
    const bytes = new Uint8Array(data.length + 1);
    bytes[0] = 0;
    bytes.set(data, 1);
    const pad = (4 - (bytes.length % 4)) % 4;
    const padded = new Uint8Array(bytes.length + pad);
    padded.set(bytes);
    let count = Math.floor(padded.length / 4);
    if(count % 2 === 1) count += 1;
    const dv = new DataView(padded.buffer);
    for(let idx=0; idx<count; idx++){
        const word = idx*4 < padded.length ? dv.getUint32(idx*4, true) : 0;
        const key = (idx%2===0) ? keyA : keyB;
        let term = Math.imul(word, key);
        let offset = Math.imul(edgeRol16(word), (idx%2===0) ? 0xEF0569FB : 0xC31713DB);
        if(idx===0){
            term = (term + Math.imul(EDGE_CS64_ADJ0, factors[0]))>>>0;
            offset = (offset + EDGE_CS64_ADJ1)>>>0;
        }
        terms.push(term>>>0);
        offsets.push(offset>>>0);
    }
    let swapAcc=0, swapLast=0, state=0, acc=0;
    for(let i=0;i<terms.length;i+=2){
        const x=terms[i], y=terms[i+1];
        let t = edgeRol16((offsets[i] + x)>>>0);
        let q = Math.imul(t, 0x76F50F34)>>>0;
        swapAcc = (swapAcc + ((Math.imul(edgeRol16(q), 0xC3EFEA97) + q)>>>0))>>>0;
        t = edgeRol16((offsets[i+1] + y)>>>0);
        q = Math.imul(t, 0x1881CE3C)>>>0;
        swapLast = (Math.imul(edgeRol16(q), 0x35BD1EC9) + q)>>>0;
        swapAcc = (swapAcc + swapLast)>>>0;
        state = (Math.imul(state, keyA) + x)>>>0;
        state = Math.imul(edgeRol16(state), 0xCF98B111)>>>0;
        state = Math.imul(edgeRol16(state), 0x87085B9F)>>>0;
        state = Math.imul(edgeRol16(state), 0x12CEB96D)>>>0;
        state = Math.imul(edgeRol16(state), 0x257E1D83)>>>0;
        acc = (acc + state)>>>0;
        let t2 = (Math.imul(state, keyB) + y)>>>0;
        t2 = Math.imul(edgeRol16(t2), 0xA27416F5)>>>0;
        t2 = Math.imul(edgeRol16(t2), 0xD38396FF)>>>0;
        state = Math.imul(edgeRol16(Math.imul(edgeRol16(t2), 0x7C932B89)>>>0), 0xBFA49F69)>>>0;
        acc = (acc + state)>>>0;
    }
    return [(swapLast ^ state)>>>0, (swapAcc ^ acc)>>>0];
}
function edgeTokenHash(data){
    const digest = edgeSha256Digest(data);
    const cs = edgeCs64Digest(data, digest);
    const csBuf = new Uint8Array(8);
    const dvcs = new DataView(csBuf.buffer);
    dvcs.setUint32(0, cs[0], true);
    dvcs.setUint32(4, cs[1], true);
    let csHex = '';
    for(let i=0;i<8;i++) csHex += csBuf[i].toString(16).padStart(2,'0');
    let dHex = '';
    for(let i=0;i<32;i++) dHex += digest[i].toString(16).padStart(2,'0');
    return csHex.toUpperCase() + '-' + dHex.toUpperCase();
}
function edgeTtsSecMsGec(){
    const unixSec = Math.floor(Date.now() / 1000);
    const bucket = unixSec - (unixSec % 300) + 11644473600;
    const ticksStr = (BigInt(bucket) * 10000000n).toString();
    const data = new TextEncoder().encode(ticksStr + EDGE_TRUSTED_TOKEN);
    return edgeTokenHash(data);
}
function edgeTtsDateString(){
    const d = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const p2 = n => String(n).padStart(2,'0');
    return days[d.getUTCDay()] + ' ' + months[d.getUTCMonth()] + ' ' + p2(d.getUTCDate()) + ' ' + d.getUTCFullYear() + ' ' +
        p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + ' GMT+0000 (Coordinated Universal Time)';
}
function edgeTtsSsml(text, voiceName, rate){
    const esc = String(text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
    let lang = 'zh-CN';
    const m = /^([a-z]{2,3}-[A-Z]{2})/.exec(voiceName);
    if (m) lang = m[1];
    let r = parseFloat(rate) || 1.0;
    if (r < 0.5) r = 0.5;
    if (r > 2) r = 2;
    const ratePct = Math.round((r - 1) * 100) + '%';
    return "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='" + lang + "'>" +
        "<voice name='" + voiceName + "'><prosody pitch='+0Hz' rate='" + ratePct + "' volume='+0%'>" +
        esc + "</prosody></voice></speak>";
}
const edgeTtsCache = new Map(); // cacheKey -> Buffer（最多 100 条）
function edgeTtsSynthesize(text, voiceName, rate, cb){
    const WS = (function(){ try { return require('ws'); } catch(e) { return null; } })();
    if (!WS) { cb(new Error('服务器缺少 ws 依赖')); return; }
    let secGec;
    try { secGec = edgeTtsSecMsGec(); } catch(e) { cb(e); return; }
    const connectionId = (function(){ try { return require('crypto').randomUUID().replace(/-/g, ''); } catch(e) { return Date.now().toString(16) + Math.random().toString(16).slice(2, 10); } })();
    const url = EDGE_TTS_WSS + '?TrustedClientToken=' + EDGE_TRUSTED_TOKEN + '&Sec-MS-GEC=' + secGec + '&Sec-MS-GEC-Version=' + EDGE_SEC_GEC_VERSION + '&ConnectionId=' + connectionId;
    let ws;
    try {
        ws = new WS(url, { headers: { 'User-Agent': EDGE_TTS_UA }, handshakeTimeout: 8000 });
    } catch(e) { cb(e); return; }
    const chunks = [];
    let finished = false;
    const finish = (err, buf) => {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);
        try { ws.terminate(); } catch(e) {}
        if (err) cb(err); else cb(null, buf);
    };
    const timer = setTimeout(() => finish(new Error('Edge TTS 超时')), 15000);
    ws.on('open', () => {
        const ts = edgeTtsDateString();
        const config = '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
        try {
            ws.send('X-Timestamp:' + ts + '\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' + config + '\r\n');
            ws.send('X-RequestId:' + connectionId + '\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:' + ts + 'Z\r\nPath:ssml\r\n\r\n' + edgeTtsSsml(text, voiceName, rate));
        } catch(e) { finish(e); }
    });
    ws.on('message', (data, isBinary) => {
        if (!isBinary) {
            if (String(data).indexOf('Path:turn.end') !== -1) {
                if (!chunks.length) finish(new Error('Edge TTS 未返回音频'));
                else finish(null, Buffer.concat(chunks));
            }
            return;
        }
        const bytes = new Uint8Array(data);
        if (bytes.length > 2) {
            const headerLen = (bytes[0] << 8) | bytes[1];
            const start = 2 + headerLen;
            if (start < bytes.length) chunks.push(Buffer.from(bytes.subarray(start)));
        }
    });
    ws.on('error', (e) => finish(e || new Error('Edge TTS 连接失败')));
    ws.on('close', () => { if (!finished) finish(new Error('Edge TTS 连接被关闭')); });
}
function handleEdgeTtsProxy(req, res) {
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
    if (text.length > 2000) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'text 过长（最多 2000 字）' }));
        return;
    }
    let voice = (params.get('voice') || 'zh-CN-XiaoxiaoNeural').trim();
    if (!EDGE_TTS_ALLOWED_VOICES.has(voice)) voice = 'zh-CN-XiaoxiaoNeural';
    let rate = parseFloat(params.get('rate') || '1');
    if (!isFinite(rate) || rate <= 0) rate = 1;
    const cacheKey = voice + '|' + rate.toFixed(2) + '|' + text;
    const hit = edgeTtsCache.get(cacheKey);
    if (hit) {
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': hit.length });
        res.end(hit);
        return;
    }
    edgeTtsSynthesize(text, voice, rate, (err, buf) => {
        if (err) {
            console.log('[EdgeTTS] 合成失败:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: err.message }));
            return;
        }
        if (edgeTtsCache.size >= 100) {
            const firstKey = edgeTtsCache.keys().next().value;
            edgeTtsCache.delete(firstKey);
        }
        edgeTtsCache.set(cacheKey, buf);
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buf.length });
        res.end(buf);
    });
}

// 腾讯云语音合成代理（/tts-tencent?text=...，返回 mp3 音频；密钥来自服务器端 tencent-keys.txt）
function handleTencentTtsProxy(req, res) {
    let query = '';
    const qIndex = req.url.indexOf('?');
    if (qIndex >= 0) query = req.url.slice(qIndex + 1);
    const p = parseTtsParams(new URLSearchParams(query));
    if (!p.text) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '缺少 text 参数' }));
        return;
    }
    if (!TENCENT_KEYS) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '服务器未配置腾讯云密钥：请在服务器目录 ' + __dirname + ' 创建 tencent-keys.txt（一行三个值：SecretId,SecretKey,AppID）后重启服务器；不想动服务器的话，在网页「设置 → 腾讯云语音识别」里填入密钥也能朗读' }));
        return;
    }
    tencentTtsMulti(TENCENT_KEYS, p.text, p.voiceType, p.speed, p.primaryLang, (err, audio) => sendTtsAudio(res, err, audio));
}

// 腾讯云语音合成代理（POST /tts-tencent-keyed）：网页里填的密钥随请求提交，服务器当场合成、绝不保存到磁盘
function handleTencentTtsKeyedProxy(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
        if (body.length > 200000) { body = body.slice(0, 200000); }
    });
    req.on('end', () => {
        let p = {};
        try { p = JSON.parse(body || '{}'); } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '请求体不是合法 JSON' }));
            return;
        }
        const text = String(p.text || '').trim();
        const secretId = String(p.secretId || '').trim();
        const secretKey = String(p.secretKey || '').trim();
        if (!text) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '缺少 text 参数' }));
            return;
        }
        if (!/^AKID/i.test(secretId) || secretId.length < 20) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'SecretId 格式不正确（应 AKID 开头、约 36 位）' }));
            return;
        }
        if (secretKey.length < 16) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'SecretKey 格式不正确（约 32 位）' }));
            return;
        }
        const voiceParam = parseInt(p.voice || '101001', 10);
        const voiceType = (voiceParam >= 101001 && voiceParam <= 101051) ? voiceParam : 101001;
        const speed = String(p.speed || '0');
        const langParam = parseInt(p.lang || '1', 10);
        const primaryLang = (langParam >= 1 && langParam <= 4) ? langParam : 1;
        tencentTtsMulti({ secretId: secretId, secretKey: secretKey }, text, voiceType, speed, primaryLang, (err, audio) => sendTtsAudio(res, err, audio));
    });
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

    // 腾讯云语音合成代理（网页里填的密钥随请求提交，服务器不保存；必须先于 /tts-tencent 判断）
    if (req.url.startsWith('/tts-tencent-keyed') && req.method === 'POST') {
        handleTencentTtsKeyedProxy(req, res);
        return;
    }

    // 腾讯云语音合成代理（服务器端 tencent-keys.txt）
    if (req.url.startsWith('/tts-tencent')) {
        handleTencentTtsProxy(req, res);
        return;
    }

    // 微软 Edge TTS 代理（服务器直连 Bing，任何浏览器都能朗读）
    if (req.url.startsWith('/tts-edge')) {
        handleEdgeTtsProxy(req, res);
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
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY, groq_key_configured: !!GROQ_API_KEY, tencent_tts_configured: !!TENCENT_KEYS }));
        return;
    }

    // 重载 API Key（也重载腾讯云密钥：新建 tencent-keys.txt 后无需重启服务器）
    if (req.url === '/reload-key' && req.method === 'POST') {
        API_KEY = loadApiKey();
        GROQ_API_KEY = loadGroqKey();
        TENCENT_KEYS = loadTencentKeys();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY, groq_key_configured: !!GROQ_API_KEY, tencent_tts_configured: !!TENCENT_KEYS }));
        console.log('[Server] 密钥已重载：DeepSeek ' + (API_KEY ? '有效' : '未配置') + '，Groq ' + (GROQ_API_KEY ? '有效' : '未配置') + '，腾讯云语音 ' + (TENCENT_KEYS ? '有效' : '未配置'));
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
    console.log('  🔊 腾讯云语音合成 Key: ' + (TENCENT_KEYS ? '已配置 ✓' : '未配置（网页设置里填的密钥仍可朗读；或创建 tencent-keys.txt 后 POST /reload-key）'));
    console.log('  💡 浏览器打开 http://localhost:' + PORT + ' 即可使用');
    const lans = getLanIps();
    for(const ip of lans) console.log('  🌐 局域网（学生连同一 WiFi）: http://' + ip + ':' + PORT);
    console.log('='.repeat(55));
});
