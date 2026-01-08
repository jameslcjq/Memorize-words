import { Env, hashPassword, createJwt, jsonResponse } from '../../utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  try {
    const { username, password } = await request.json() as any
    if (!username || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400)
    }

    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<any>()
    if (!user) {
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    const hash = await hashPassword(password)
    if (user.password !== hash) {
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }

    // Secret fallback for dev only - in prod set JWT_SECRET in dashboard
    const secret = env.JWT_SECRET || 'dev_secret_key_123'
    const token = await createJwt({ sub: user.id, username: user.username }, secret)

    return jsonResponse({
      success: true,
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname }
    })
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
}
