import { Env, verifyJwt, jsonResponse } from '../utils'

// Middleware-like helper for auth
async function requireAuth(request: Request, env: Env) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized')
    }
    const token = authHeader.split(' ')[1]
    const secret = env.JWT_SECRET || 'dev_secret_key_123'
    return await verifyJwt(token, secret)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context
    try {
        const user = await requireAuth(request, env)
        const { data } = await request.json() as any

        if (!data) return jsonResponse({ error: 'No data provided' }, 400)

        const now = Date.now()
        await env.DB.prepare(
            'INSERT INTO sync_data (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = ?, updated_at = ?'
        ).bind(user.sub, JSON.stringify(data), now, JSON.stringify(data), now).run()

        return jsonResponse({ success: true, updated_at: now })
    } catch (err: any) {
        return jsonResponse({ error: err.message }, err.message === 'Unauthorized' ? 401 : 500)
    }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context
    try {
        const user = await requireAuth(request, env)

        const record = await env.DB.prepare('SELECT data, updated_at FROM sync_data WHERE user_id = ?').bind(user.sub).first<any>()

        if (!record) {
            return jsonResponse({ error: 'No data found' }, 404)
        }

        return jsonResponse({ success: true, data: JSON.parse(record.data), updated_at: record.updated_at })
    } catch (err: any) {
        return jsonResponse({ error: err.message }, err.message === 'Unauthorized' ? 401 : 500)
    }
}
