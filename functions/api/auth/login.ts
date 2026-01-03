interface Env {
    DB: D1Database
}

// Simple hash utility for "Edge" environment
async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context

    try {
        const body = await request.json() as {
            type: 'register' | 'login',
            username?: string,
            password?: string,
            nickname?: string
        }
        const { type, username, password, nickname } = body

        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400 })
        }

        const hashedPassword = await hashPassword(password)

        if (type === 'register') {
            // Check exist
            const exist = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
            if (exist) {
                return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 400 })
            }

            const userId = crypto.randomUUID()
            await env.DB.prepare(
                'INSERT INTO users (id, username, password, nickname, created_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(userId, username, hashedPassword, nickname || 'User', Date.now()).run()

            return new Response(JSON.stringify({
                success: true,
                data: { userId, nickname: nickname || 'User' }
            }), { headers: { 'Content-Type': 'application/json' } })

        } else {
            // Login
            const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first()

            if (!user || user.password !== hashedPassword) {
                return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 })
            }

            return new Response(JSON.stringify({
                success: true,
                data: { userId: user.id, nickname: user.nickname }
            }), { headers: { 'Content-Type': 'application/json' } })
        }

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}
