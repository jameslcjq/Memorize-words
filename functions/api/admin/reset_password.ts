interface Env {
    DB: D1Database
}

// Simple hash utility (same as in login.ts)
async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context

    try {
        const body = (await request.json()) as { userId: string; newPassword: string }
        const { userId, newPassword } = body

        if (!userId || !newPassword) {
            return new Response(JSON.stringify({ error: 'Missing userId or newPassword' }), { status: 400 })
        }

        const hashedPassword = await hashPassword(newPassword)

        // Update password
        const result = await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?')
            .bind(hashedPassword, userId)
            .run()

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'User not found or password unchanged' }), { status: 404 })
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}
