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

        // 1. 班级口令校验（/tts 语音接口除外；不匹配直接拒绝，不消耗 AI 额度）
        const isTtsRoute = (url.pathname === '/tts' && request.method === 'GET');
        const token = request.headers.get('X-Class-Token') || '';
        if (!isTtsRoute && (!env.CLASS_TOKEN || token !== env.CLASS_TOKEN)) {
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

        // 3.5 腾讯云语音合成代理（/tts?text=...，返回 mp3 音频；密钥放在 Worker 环境变量里）
        if (url.pathname === '/tts' && request.method === 'GET') {
            const text = (url.searchParams.get('text') || '').trim();
            if (!text) return jsonResponse(400, { error: '缺少 text 参数' });
            const secretId = env.TENCENT_SECRET_ID || '';
            const secretKey = env.TENCENT_SECRET_KEY || '';
            if (!secretId || !secretKey) return jsonResponse(500, { error: 'Worker 未配置 TENCENT_SECRET_ID / TENCENT_SECRET_KEY' });
            try {
                const host = 'tts.tencentcloudapi.com';
                const service = 'tts';
                const action = 'TextToVoice';
                const version = '2019-08-23';
                const ts = Math.floor(Date.now() / 1000);
                const date = new Date(ts * 1000).toISOString().slice(0, 10);
                const payload = JSON.stringify({
                    Text: text,
                    SessionId: 'hsk' + Date.now(),
                    VoiceType: 101001,
                    Codec: 'mp3',
                    SampleRate: 16000,
                    Speed: 0,
                    Volume: 0,
                    ProjectId: 0,
                    PrimaryLanguage: 1,
                });
                const enc = new TextEncoder();
                const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
                const hmacKey = async (keyData, msg) => {
                    const k = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
                    return crypto.subtle.sign('HMAC', k, enc.encode(msg));
                };
                const hashedPayload = toHex(await crypto.subtle.digest('SHA-256', enc.encode(payload)));
                const canonicalHeaders = 'content-type:application/json; charset=utf-8\nhost:' + host + '\nx-tc-action:' + action.toLowerCase() + '\n';
                const signedHeaders = 'content-type;host;x-tc-action';
                const canonicalRequest = 'POST\n/\n\n' + canonicalHeaders + '\n' + signedHeaders + '\n' + hashedPayload;
                const secretDate = await hmacKey(enc.encode('TC3' + secretKey), date);
                const secretService = await hmacKey(secretDate, service);
                const secretSigning = await hmacKey(secretService, 'tc3_request');
                const stringToSign = 'TC3-HMAC-SHA256\n' + ts + '\n' + date + '/' + service + '/tc3_request\n' + toHex(await crypto.subtle.digest('SHA-256', enc.encode(canonicalRequest)));
                const signature = toHex(await hmacKey(secretSigning, stringToSign));
                const authorization = 'TC3-HMAC-SHA256 Credential=' + secretId + '/' + date + '/' + service + '/tc3_request, SignedHeaders=' + signedHeaders + ', Signature=' + signature;
                const upstream = await fetch('https://' + host + '/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'X-TC-Action': action,
                        'X-TC-Version': version,
                        'X-TC-Timestamp': String(ts),
                        'X-TC-Region': 'ap-guangzhou',
                        'X-TC-Language': 'zh-CN',
                        'Authorization': authorization,
                    },
                    body: payload,
                });
                const upstreamJson = await upstream.json().catch(() => ({}));
                if (!upstream.ok || (upstreamJson.Response && upstreamJson.Response.Error)) {
                    const err = upstreamJson.Response && upstreamJson.Response.Error;
                    return jsonResponse(502, { error: (err && (err.Code + ' ' + err.Message)) || ('上游返回 ' + upstream.status) });
                }
                const audioB64 = upstreamJson.Response && upstreamJson.Response.Audio;
                if (!audioB64) return jsonResponse(502, { error: '上游无音频返回' });
                const bin = atob(audioB64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return new Response(bytes, {
                    status: 200,
                    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400', ...CORS_HEADERS },
                });
            } catch (e) {
                return jsonResponse(500, { error: 'TTS 代理出错: ' + (e && e.message) });
            }
        }

        // 4. 只代理 DeepSeek 对话接口（/tts 在上面已处理）
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
