import { getJwtSecret, errorResponse } from '../../auth'
import { Env, LEGACY_PASSWORD_SALT, createJwt, generatePasswordSalt, hashPassword, jsonResponse } from '../../utils'

type UserRow = {
  id: string
  username: string
  password: string
  password_salt?: string | null
  nickname?: string | null
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  try {
    const { username, password } = (await request.json()) as { username?: string; password?: string }
    const normalizedUsername = username?.trim()
    if (!normalizedUsername || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400)
    }

    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(normalizedUsername).first<UserRow>()
    if (!user) {
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    const passwordSalt = user.password_salt || LEGACY_PASSWORD_SALT
    const hash = await hashPassword(password, passwordSalt)
    if (user.password !== hash) {
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    if (!user.password_salt) {
      const upgradedSalt = generatePasswordSalt()
      const upgradedHash = await hashPassword(password, upgradedSalt)
      await env.DB.prepare('UPDATE users SET password = ?, password_salt = ? WHERE id = ?').bind(upgradedHash, upgradedSalt, user.id).run()
    }

    const secret = getJwtSecret(env)
    const token = await createJwt({ sub: user.id, username: user.username }, secret)

    return jsonResponse({
      success: true,
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
