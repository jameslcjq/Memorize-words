interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = (await request.json()) as { userId: string }
    const { userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 })
    }

    const result = await env.DB.prepare('DELETE FROM points_transactions WHERE user_id = ?').bind(userId).run()

    return new Response(JSON.stringify({ success: true, deleted: result.meta.changes }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
