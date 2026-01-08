import { Env, hashPassword, jsonResponse } from '../../utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context
    try {
        const { username, password, nickname } = await request.json() as any
        if (!username || !password) {
            return jsonResponse({ error: 'Username and password required' }, 400)
        }

        const id = crypto.randomUUID()
        const passwordHash = await hashPassword(password)
        const createdAt = Date.now()

        // Check if user exists
        const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
        if (existing) {
            return jsonResponse({ error: 'User already exists' }, 409)
        }

        await env.DB.prepare(
            'INSERT INTO users (id, username, password, nickname, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, username, passwordHash, nickname || username, createdAt).run()

        return jsonResponse({ success: true, user: { id, username, nickname } }, 201)
    } catch (err: any) {
        return jsonResponse({ error: err.message }, 500)
    }
}
