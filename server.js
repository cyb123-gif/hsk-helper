// HSK 语法助手 - DeepSeek API 代理服务器 + 聊天日志系统
// 启动: node server.js
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const PORT = process.env.PORT || 3001;
const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/v1/chat/completions';
const LOG_DIR = path.join(__dirname, 'chat_logs');
const USERS_FILE = path.join(__dirname, 'teacher_users.json');
const TEACHER_PWD = process.env.TEACHER_PASSWORD || 'admin888';

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

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

// ========== 聊天日志 ==========
const activeSessions = new Map(); // username -> { lastSeen, startedAt }

function logFilePath(username) {
    const safe = username.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
    return path.join(LOG_DIR, safe + '.jsonl');
}

function appendChatLog(username, entry) {
    const file = logFilePath(username);
    entry.time = new Date().toISOString();
    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8');
}

function readChatLogs(username) {
    const file = logFilePath(username);
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf-8');
    return raw.trim().split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch (e) { return null; }
    }).filter(Boolean);
}

function listAllUsers() {
    const users = new Set();
    const files = fs.readdirSync(LOG_DIR);
    for (const f of files) {
        if (f.endsWith('.jsonl')) {
            users.add(f.replace('.jsonl', ''));
        }
    }
    return Array.from(users);
}

// 向所有用户日志追加同一笔 session 需要分开写

// ========== 静态文件服务 ==========
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    // 只允许访问根目录下的文件
    filePath = path.join(__dirname, path.basename(filePath));
    if (!fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
    return true;
}

// ========== HTTP 服务器 ==========
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ===== 聊天日志上报 =====
    if (req.url === '/chat-log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const username = data.username || 'anonymous';
                data.ip = req.socket.remoteAddress;
                appendChatLog(username, data);
                activeSessions.set(username, { lastSeen: Date.now(), startedAt: activeSessions.get(username)?.startedAt || Date.now() });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // ===== 心跳 =====
    if (req.url === '/ping' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const username = data.username || 'anonymous';
                activeSessions.set(username, { lastSeen: Date.now(), startedAt: activeSessions.get(username)?.startedAt || Date.now() });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // ===== 教师 API: 获取在线用户 =====
    if (req.url === '/teacher/online' && req.method === 'GET') {
        const auth = req.headers['authorization'];
        if (auth !== 'Bearer ' + TEACHER_PWD) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        const now = Date.now();
        const online = [];
        for (const [user, sess] of activeSessions) {
            if (now - sess.lastSeen < 120000) { // 2分钟内活跃
                online.push({ username: user, lastSeen: new Date(sess.lastSeen).toISOString(), startedAt: new Date(sess.startedAt).toISOString() });
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(online));
        return;
    }

    // ===== 教师 API: 获取某用户聊天记录 =====
    if (req.url === '/teacher/logs' && req.method === 'POST') {
        const auth = req.headers['authorization'];
        if (auth !== 'Bearer ' + TEACHER_PWD) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const logs = readChatLogs(data.username);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ username: data.username, logs }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // ===== 教师 API: 获取所有用户列表 =====
    if (req.url === '/teacher/users' && req.method === 'GET') {
        const auth = req.headers['authorization'];
        if (auth !== 'Bearer ' + TEACHER_PWD) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        const users = listAllUsers();
        const allSessions = [];
        const now = Date.now();
        for (const u of users) {
            const sess = activeSessions.get(u);
            allSessions.push({
                username: u,
                online: sess ? (now - sess.lastSeen < 120000) : false,
                lastSeen: sess ? new Date(sess.lastSeen).toISOString() : null,
                startedAt: sess ? new Date(sess.startedAt).toISOString() : null,
                messageCount: readChatLogs(u).length
            });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(allSessions));
        return;
    }

    // ===== 教师 API: 下载某用户聊天记录为文本 =====
    if (req.url === '/teacher/download' && req.method === 'POST') {
        const auth = req.headers['authorization'];
        if (auth !== 'Bearer ' + TEACHER_PWD) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const logs = readChatLogs(data.username);
                let txt = '学生: ' + data.username + '\n';
                txt += '导出时间: ' + new Date().toISOString() + '\n';
                txt += '='.repeat(60) + '\n\n';
                for (const log of logs) {
                    if (log.type === 'message') {
                        txt += '[' + (log.time || '') + '] ' + log.role + ': ' + (log.content || '') + '\n\n';
                    } else if (log.type === 'session_end') {
                        txt += '--- 对话结束 ---\n\n';
                    } else if (log.type === 'session_start') {
                        txt += '--- 新对话开始 ---\n\n';
                    }
                }
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="' + encodeURIComponent(data.username) + '_chat.txt"'
                });
                res.end(txt);
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // ===== 教师面板页面 =====
    if (req.url === '/teacher' || req.url === '/teacher/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getTeacherHTML());
        return;
    }

    // ===== DeepSeek API 代理 =====
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

    // 重载 API Key
    if (req.url === '/reload-key' && req.method === 'POST') {
        API_KEY = loadApiKey();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', key_configured: !!API_KEY }));
        console.log('[Proxy] API Key 已重载，' + (API_KEY ? '有效' : '未配置'));
        return;
    }

    // 静态文件服务
    if (serveStatic(req, res)) return;

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

function handleProxy(req, res) {
    if (!API_KEY) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '服务器未配置 API Key，请联系管理员' }));
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const now = new Date().toLocaleTimeString();
        console.log(`[Proxy] → DeepSeek  ${now}  ${body.length} bytes`);

        const options = {
            hostname: DEEPSEEK_HOST, port: 443, path: DEEPSEEK_PATH, method: 'POST',
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

function getTeacherHTML() {
    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>教师监控面板 · HSK 语法助手</title>
<style>
* { box-sizing: border-box; font-family: system-ui, sans-serif; }
body { margin: 0; min-height: 100vh; background: #f0f2f5; }
.login-overlay { position: fixed; inset: 0; background: #1e2b5e; display: flex; justify-content: center; align-items: center; z-index: 999; }
.login-card { background: white; border-radius: 20px; padding: 36px; width: 90%; max-width: 360px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
.login-card h2 { color: #1e2b5e; margin: 0 0 8px; }
.login-card p { color: #94a3b8; font-size: 0.85rem; margin: 0 0 20px; }
.login-card input { width: 100%; padding: 12px 16px; border: 1.5px solid #d0dae8; border-radius: 30px; font-size: 1rem; outline: none; }
.login-card button { width: 100%; padding: 12px; background: #1e2b5e; color: white; border: none; border-radius: 30px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 12px; }
.login-error { color: #c0392b; font-size: 0.8rem; margin-top: 8px; min-height: 20px; }
.dashboard { display: none; padding: 24px; max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header h1 { color: #1e2b5e; margin: 0; font-size: 1.5rem; }
.header button { background: #e74c3c; color: white; border: none; padding: 8px 18px; border-radius: 20px; cursor: pointer; font-weight: 600; }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.user-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: 0.15s; }
.user-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
.user-card.online { border-left: 4px solid #27ae60; }
.user-card.offline { border-left: 4px solid #ccc; }
.user-card h3 { margin: 0 0 8px; color: #1e293b; display: flex; align-items: center; gap: 8px; }
.online-dot { width: 10px; height: 10px; border-radius: 50%; background: #27ae60; display: inline-block; }
.offline-dot { width: 10px; height: 10px; border-radius: 50%; background: #ccc; display: inline-block; }
.user-card .meta { font-size: 0.8rem; color: #64748b; }
.chat-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
.chat-modal.show { display: flex; }
.chat-modal-content { background: white; border-radius: 20px; width: 90%; max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.chat-modal-header { padding: 16px 20px; background: #1e2b5e; color: white; display: flex; justify-content: space-between; align-items: center; }
.chat-modal-header h3 { margin: 0; }
.chat-modal-header button { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
.chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.chat-msg { max-width: 85%; padding: 10px 16px; border-radius: 18px; line-height: 1.5; font-size: 0.9rem; word-break: break-word; }
.chat-msg.user { align-self: flex-end; background: #d9e6ff; color: #1a2b4c; }
.chat-msg.assistant { align-self: flex-start; background: #f1f5f9; border: 1px solid #dee5ed; }
.chat-msg.system { align-self: center; font-size: 0.75rem; color: #94a3b8; background: none; }
.chat-msg .time { font-size: 0.65rem; color: #94a3b8; margin-top: 4px; }
.chat-modal-actions { padding: 12px 20px; border-top: 1px solid #e9eef4; display: flex; gap: 10px; }
.chat-modal-actions button { padding: 8px 16px; border-radius: 20px; border: 1px solid #d0dae8; background: white; cursor: pointer; font-size: 0.85rem; }
.chat-modal-actions button:hover { background: #eef2ff; }
.chat-modal-actions .btn-download { background: #1e2b5e; color: white; border: none; }
.toast { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background: #1e2b5e; color: white; padding: 8px 20px; border-radius: 20px; z-index: 9999; opacity: 0; transition: opacity 0.3s; }
.toast.show { opacity: 1; }
</style>
</head>
<body>

<div class="login-overlay" id="loginOverlay">
    <div class="login-card">
        <h2>🔐 教师监控面板</h2>
        <p>请输入教师密码</p>
        <input type="password" id="pwdInput" placeholder="教师密码" onkeypress="if(event.key==='Enter')login()">
        <button onclick="login()">登 录</button>
        <div class="login-error" id="loginError"></div>
    </div>
</div>

<div class="dashboard" id="dashboard">
    <div class="header">
        <h1>📊 学生聊天监控</h1>
        <div>
            <button onclick="refresh()" style="background:#27ae60;margin-right:8px;">🔄 刷新</button>
            <button onclick="logout()">退出</button>
        </div>
    </div>
    <div class="user-grid" id="userGrid">加载中...</div>
</div>

<div class="chat-modal" id="chatModal">
    <div class="chat-modal-content">
        <div class="chat-modal-header">
            <h3 id="chatModalTitle"></h3>
            <button onclick="closeChatModal()">&times;</button>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-modal-actions">
            <button class="btn-download" onclick="downloadChat()">⬇️ 下载聊天记录</button>
            <button onclick="closeChatModal()">关闭</button>
        </div>
    </div>
</div>

<div class="toast" id="toast"></div>

<script>
let TOKEN = '';
let currentViewUser = '';

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

async function login() {
    const pwd = document.getElementById('pwdInput').value;
    document.getElementById('loginError').textContent = '';
    TOKEN = pwd;
    const resp = await fetch('/teacher/online', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    if (resp.status === 401) {
        document.getElementById('loginError').textContent = '密码错误';
        TOKEN = '';
        return;
    }
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    refresh();
    setInterval(refresh, 30000);
}

function logout() {
    TOKEN = '';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

async function refresh() {
    try {
        const resp = await fetch('/teacher/users', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
        const users = await resp.json();
        const grid = document.getElementById('userGrid');
        if (users.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px;">暂无聊天记录</div>';
            return;
        }
        grid.innerHTML = users.map(u => {
            const dot = u.online ? '<span class="online-dot"></span>' : '<span class="offline-dot"></span>';
            const status = u.online ? '🟢 在线' : '⚪ 离线';
            const lastSeen = u.lastSeen ? new Date(u.lastSeen).toLocaleString('zh-CN') : '从未';
            const started = u.startedAt ? new Date(u.startedAt).toLocaleString('zh-CN') : '-';
            return '<div class="user-card ' + (u.online ? 'online' : 'offline') + '" onclick="viewChat(\'' + u.username + '\')">' +
                '<h3>' + dot + ' ' + u.username + '</h3>' +
                '<div class="meta">状态: ' + status + '</div>' +
                '<div class="meta">消息数: ' + u.messageCount + '</div>' +
                '<div class="meta">最近活跃: ' + lastSeen + '</div>' +
                '<div class="meta">首次上线: ' + started + '</div>' +
                '</div>';
        }).join('');
    } catch (e) { /* ignore */ }
}

async function viewChat(username) {
    currentViewUser = username;
    document.getElementById('chatModalTitle').textContent = '💬 ' + username + ' 的聊天记录';
    document.getElementById('chatMessages').innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">加载中...</div>';
    document.getElementById('chatModal').classList.add('show');
    try {
        const resp = await fetch('/teacher/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
            body: JSON.stringify({ username })
        });
        const data = await resp.json();
        const msgs = document.getElementById('chatMessages');
        if (data.logs.length === 0) {
            msgs.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">暂无聊天记录</div>';
            return;
        }
        msgs.innerHTML = data.logs.map(log => {
            if (log.type === 'message') {
                const role = log.role === 'user' ? 'user' : 'assistant';
                const content = role === 'assistant' ? log.content.replace(/<br>/g, '\\n') : log.content;
                return '<div class="chat-msg ' + role + '"><div>' + content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>') + '</div><div class="time">' + new Date(log.time).toLocaleString('zh-CN') + '</div></div>';
            } else if (log.type === 'session_end') {
                return '<div class="chat-msg system">── 对话结束 ──</div>';
            } else if (log.type === 'session_start') {
                return '<div class="chat-msg system">── 新对话开始 ──</div>';
            } else if (log.type === 'online') {
                return '';
            }
            return '';
        }).join('');
    } catch (e) {
        document.getElementById('chatMessages').innerHTML = '<div style="text-align:center;color:#c0392b;padding:20px;">加载失败</div>';
    }
}

function closeChatModal() {
    document.getElementById('chatModal').classList.remove('show');
    currentViewUser = '';
}

async function downloadChat() {
    if (!currentViewUser) return;
    try {
        const resp = await fetch('/teacher/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
            body: JSON.stringify({ username: currentViewUser })
        });
        const blob = await resp.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentViewUser + '_chat.txt';
        a.click();
        toast('✅ 下载完成');
    } catch (e) {
        toast('❌ 下载失败');
    }
}
</script>
</body>
</html>`;
}

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('  HSK 语法助手 - 服务器');
    console.log('  端口: ' + PORT);
    console.log('  API Key: ' + (API_KEY ? '已配置 ✓' : '❌ 未配置'));
    console.log('  聊天日志目录: ' + LOG_DIR);
    console.log('  教师面板: http://localhost:' + PORT + '/teacher');
    console.log('  教师密码: ' + TEACHER_PWD);
    console.log('='.repeat(50));
});
