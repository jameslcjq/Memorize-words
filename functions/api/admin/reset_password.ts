import { hashPassword, jsonResponse } from '../../utils'

interface Env {
  DB: D1Database
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
    const result = await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hashedPassword, userId).run()

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
