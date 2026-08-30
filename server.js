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

// ========== HTTP 服务器 ==========
const server = http.createServer((req, res) => {
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
