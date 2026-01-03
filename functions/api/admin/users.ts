interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context

  try {
    // Limit to 50 for now
    const { results } = await env.DB.prepare(
      'SELECT id, username, nickname, created_at as createdAt FROM users ORDER BY created_at DESC LIMIT 50',
    ).all()

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
