// ============================================================
// 汉语学习助手 · Pages Function：GET /ping
// 作用：验证班级口令（不消耗 AI 额度）
// ============================================================

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

    // 班级口令校验（不匹配直接拒绝，不消耗 AI 额度）
    const token = request.headers.get('X-Class-Token') || '';
    if (!env.CLASS_TOKEN || token !== env.CLASS_TOKEN) {
        return jsonResponse(401, { code: 'class_token_invalid', error: { message: 'CLASS_TOKEN_INVALID' } });
    }

    return jsonResponse(200, { ok: true });
}
