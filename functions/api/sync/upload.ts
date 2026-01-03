interface Env {
    DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context

    try {
        const body = await request.json() as { userId: string, records: any[] }
        const { userId, records } = body

        if (!userId || !Array.isArray(records)) {
            return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
        }

        // Process records in a transaction? D1 supports batch.
        // Logic: simpler to iterate for now or use batch if D1 client supports it nicely via prepared statements.

        // We expect records to be [{ date: '2023-10-01', duration: 10, wordCount: 50 }, ...]
        const stmt = env.DB.prepare(`
      INSERT INTO study_records (user_id, date, duration, word_count, updated_at) 
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        duration = excluded.duration,
        word_count = excluded.word_count,
        updated_at = excluded.updated_at
    `)

        const batch = records.map(r => stmt.bind(
            userId,
            r.date,
            r.duration || 0,
            r.wordCount || 0,
            Date.now()
        ))

        const results = await env.DB.batch(batch)

        return new Response(JSON.stringify({ success: true, count: results.length }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}
