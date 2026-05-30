import { generatePasswordSalt, hashPassword, jsonResponse } from '../../utils'

interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = (await request.json()) as { userId: string; newPassword: string }
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return jsonResponse({ error: 'Missing userId or newPassword' }, 400)
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return jsonResponse({ error: 'Invalid password length' }, 400)
    }

    const passwordSalt = generatePasswordSalt()
    const hashedPassword = await hashPassword(newPassword, passwordSalt)

    // Update password
    const result = await env.DB.prepare('UPDATE users SET password = ?, password_salt = ? WHERE id = ?')
      .bind(hashedPassword, passwordSalt, userId)
      .run()

    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'User not found or password unchanged' }, 404)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500)
  }
}
