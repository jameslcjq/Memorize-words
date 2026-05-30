import { Env, generatePasswordSalt, hashPassword, jsonResponse } from '../../utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  try {
    const { username, password, nickname } = (await request.json()) as { username?: string; password?: string; nickname?: string }
    const normalizedUsername = username?.trim()
    if (!normalizedUsername || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400)
    }
    if (normalizedUsername.length > 64 || password.length < 6 || password.length > 128) {
      return jsonResponse({ error: 'Invalid username or password length' }, 400)
    }

    const id = crypto.randomUUID()
    const passwordSalt = generatePasswordSalt()
    const passwordHash = await hashPassword(password, passwordSalt)
    const createdAt = Date.now()
    const displayName = nickname?.trim() || normalizedUsername

    // Check if user exists
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(normalizedUsername).first()
    if (existing) {
      return jsonResponse({ error: 'User already exists' }, 409)
    }

    await env.DB.prepare('INSERT INTO users (id, username, password, password_salt, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, normalizedUsername, passwordHash, passwordSalt, displayName, createdAt)
      .run()

    return jsonResponse({ success: true, user: { id, username: normalizedUsername, nickname: displayName } }, 201)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500)
  }
}
