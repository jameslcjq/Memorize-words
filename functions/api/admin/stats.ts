interface Env {
    DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env } = context

    try {
        const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count')
        const recordCount = await env.DB.prepare('SELECT COUNT(*) as count FROM study_records').first('count')

        // Active users in last 24 hours (based on updated_at in study_records)
        // updated_at is unix timestamp (seconds or ms? In schema it was INTEGER. In upload.ts we passed Date.now() / 1000 or Date.now()? 
        // Let's check upload.ts usage. 
        // Assuming Date.now() was used which is ms.

        // Wait, let's verify Schema. upload.ts passes `Date.now()`. So it is MS.
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        const activeCount = await env.DB.prepare('SELECT COUNT(DISTINCT user_id) as count FROM study_records WHERE updated_at > ?').bind(oneDayAgo).first('count')

        return new Response(JSON.stringify({
            success: true,
            data: {
                totalUsers: userCount,
                totalRecords: recordCount,
                activeUsersToday: activeCount
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}
