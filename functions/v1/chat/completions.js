// ============================================================
// 汉语学习助手 · Pages Function：POST /v1/chat/completions
// 作用：把 DeepSeek API Key 藏在服务器端 + 班级口令 + 简单限流
// 说明：部署在 Pages 项目里，与网页同域（hsk-helper.pages.dev），
//       不依赖被墙的 workers.dev 域名。
// ============================================================

const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_PATH = '/v1/chat/completions';
const RATE_LIMIT_PER_MIN = 120; // 每个 IP 每分钟最多 120 次 AI 调用，防止口令泄露后被刷爆

// 简单内存限流（每 IP 每分钟）。
// 注意：Pages Functions 实例会随时回收，这个限制是轻量保护，不是严格的全局限流。
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

export async function onRequest(context) {
    const { request, env } = context;

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

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

    // 3. 只代理 DeepSeek 对话接口的 POST 请求
    if (request.method !== 'POST') {
        return jsonResponse(404, { code: 'not_found', error: { message: 'NOT_FOUND' } });
    }

    // 4. 服务器端 Key 检查
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
}
