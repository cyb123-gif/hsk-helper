// ============================================================
// 汉语学习助手 · Cloudflare Worker 代理
// 作用：把 DeepSeek API Key 藏在服务器端 + 用"班级口令"限制使用者
// ============================================================
// 部署步骤：
//   1. 打开 https://dash.cloudflare.com 注册/登录（免费）
//   2. 左侧菜单 Workers & Pages → Create → Create Worker
//   3. 给 Worker 起个名字（如 hsk-helper），点 Deploy
//   4. 点 Edit code，把本文件内容全部粘贴进去，点 Deploy
//   5. Worker 页面 → Settings → Variables and Secrets → Add secret：
//        DEEPSEEK_API_KEY  = 你的新 DeepSeek API Key
//        CLASS_TOKEN      = 班级口令（你自己定，如 xuehanyu2026，发给学生）
//   6. 记下 Worker 域名（形如 https://hsk-helper.xxxx.workers.dev）
//   7. 把域名填到 index.html 里的 WORKER_BASE（不带结尾斜杠）
// ============================================================

const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/v1/chat/completions';
const RATE_LIMIT_PER_MIN = 120; // 每个 IP 每分钟最多 120 次 AI 调用，防止口令泄露后被刷爆

// 简单内存限流（每 IP 每分钟）
const buckets = new Map();

function rateLimited(ip) {
    const now = Date.now();
    // 防止 Map 无限增长
    if (buckets.size > 500) {
        for (const [k, v] of buckets) {
            if (now > v.reset + 60000) buckets.delete(k);
        }
    }
    let b = buckets.get(ip);
    if (!b || now > b.reset) {
        b = { count: 0, reset: now + 60000 };
        buckets.set(ip, b);
    }
    b.count++;
    return b.count > RATE_LIMIT_PER_MIN;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Class-Token, Authorization',
    'Access-Control-Max-Age': '86400',
};

function jsonResponse(status, obj) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
    });
}

export default {
    async fetch(request, env) {
        // CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

        // 1. 班级口令校验（不匹配直接拒绝，不消耗 AI 额度）
        const token = request.headers.get('X-Class-Token') || '';
        if (!env.CLASS_TOKEN || token !== env.CLASS_TOKEN) {
            return jsonResponse(401, { code: 'class_token_invalid', error: { message: 'CLASS_TOKEN_INVALID' } });
        }

        // 2. 限流
        if (rateLimited(ip)) {
            return jsonResponse(429, { code: 'rate_limited', error: { message: 'RATE_LIMITED' } });
        }

        // 3. 口令验证接口（页面用它检查口令是否正确，不消耗 AI 额度）
        if (url.pathname === '/ping' && request.method === 'GET') {
            return jsonResponse(200, { ok: true });
        }

        // 4. 只代理 DeepSeek 对话接口
        if (url.pathname !== DEEPSEEK_PATH || request.method !== 'POST') {
            return jsonResponse(404, { code: 'not_found', error: { message: 'NOT_FOUND' } });
        }

        if (!env.DEEPSEEK_API_KEY) {
            return jsonResponse(500, { code: 'server_key_missing', error: { message: 'SERVER_KEY_MISSING' } });
        }

        // 5. 转发给 DeepSeek（真实 Key 只在服务器端使用）
        const body = await request.text();
        const upstream = await fetch('https://' + DEEPSEEK_HOST + DEEPSEEK_PATH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY,
            },
            body,
        });

        const text = await upstream.text();
        return new Response(text, {
            status: upstream.status,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
        });
    },
};
