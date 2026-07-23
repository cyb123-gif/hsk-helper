// HSK 语法助手 - DeepSeek API 代理服务器
// 启动: node server.js
// API Key 只存在服务器端，学生浏览器永远接触不到
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const PORT = process.env.PORT || 3001;
const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/v1/chat/completions';

// 从 api-key.txt 读取 API Key（第一行非空内容）
function loadApiKey() {
    const keyFile = path.join(__dirname, 'api-key.txt');
    try {
        const content = fs.readFileSync(keyFile, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) return trimmed;
        }
    } catch (e) {
        // 文件不存在
    }
    return process.env.DEEPSEEK_API_KEY || null;
}

let API_KEY = loadApiKey();

// ========== HTTP 服务器 ==========
const server = http.createServer((req, res) => {
    // CORS headers - 允许任意来源（本地使用）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 仅代理 /v1/chat/completions
    if (req.url === DEEPSEEK_PATH && req.method === 'POST') {
        handleProxy(req, res);
        return;
    }

    // 健康检查
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY }));
        return;
    }

    // 重载 API Key（不重启服务器）
    if (req.url === '/reload-key' && req.method === 'POST') {
        API_KEY = loadApiKey();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY }));
        console.log('[Proxy] API Key 已重载，' + (API_KEY ? '有效' : '未配置'));
        return;
    }

    // 其他请求 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

function handleProxy(req, res) {
    if (!API_KEY) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '服务器未配置 API Key，请联系管理员' }));
        return;
    }

    // 收集请求体
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        console.log(`[Proxy] → DeepSeek  ${new Date().toLocaleTimeString()}  ${body.length} bytes`);

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
            timeout: 60000
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });

            let responseBody = '';
            proxyRes.on('data', chunk => { responseBody += chunk; });
            proxyRes.on('end', () => {
                console.log(`[Proxy] ← DeepSeek  ${proxyRes.statusCode}  ${responseBody.length} bytes`);
                res.end(responseBody);
            });
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] 请求失败:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API 请求失败: ' + err.message }));
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API 请求超时' }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
}

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('  HSK 语法助手 - API 代理服务器');
    console.log('  端口: ' + PORT);
    console.log('  API Key: ' + (API_KEY ? '已配置 ✓' : '❌ 未配置！请创建 api-key.txt'));
    console.log('  前端请求: http://localhost:' + PORT + '/v1/chat/completions');
    console.log('  健康检查: http://localhost:' + PORT + '/health');
    console.log('  重载 Key: POST http://localhost:' + PORT + '/reload-key');
    console.log('='.repeat(50));
});
