interface Env {
    DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 })
    }

    try {
        const { results } = await env.DB.prepare(
            'SELECT date, duration, word_count as wordCount, updated_at as updatedAt FROM study_records WHERE user_id = ?'
        ).bind(userId).all()

        return new Response(JSON.stringify({ success: true, data: results }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}
