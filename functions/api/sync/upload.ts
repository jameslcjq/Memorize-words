interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = (await request.json()) as { userId: string; records: any[] }
    const { userId, records } = body

    if (!userId || !Array.isArray(records)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Process records in a transaction? D1 supports batch.
    // Logic: simpler to iterate for now or use batch if D1 client supports it nicely via prepared statements.

    // 1. Study Records (Existing)
    if (records && records.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO study_records (user_id, date, duration, word_count, updated_at) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
          duration = excluded.duration,
          word_count = excluded.word_count,
          updated_at = excluded.updated_at
      `)
      const batch = records.map((r) => stmt.bind(userId, r.date, r.duration || 0, r.wordCount || 0, Date.now()))
      await env.DB.batch(batch)
    }

    // 2. Word Records (Sync Details)
    const { wordRecords, chapterRecords } = body as any

    if (Array.isArray(wordRecords) && wordRecords.length > 0) {
      // Split records: delete if correctCount >= 3, otherwise upsert
      const recordsToDelete = wordRecords.filter((r) => (r.correctCount || 0) >= 3)
      const recordsToUpsert = wordRecords.filter((r) => (r.correctCount || 0) < 3)

      // Delete completed records (correctCount >= 3)
      if (recordsToDelete.length > 0) {
        const stmtDelete = env.DB.prepare(`
          DELETE FROM word_records 
          WHERE user_id = ? AND word = ? AND dict = ?
        `)
        const batchDelete = recordsToDelete.map((r) => stmtDelete.bind(userId, r.word, r.dict))
        await env.DB.batch(batchDelete)
      }

      // Upsert incomplete records
      if (recordsToUpsert.length > 0) {
        const stmtWord = env.DB.prepare(`
          INSERT INTO word_records (user_id, word, dict, chapter, wrong_count, correct_count, mistakes, timestamp, mode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, dict, word) DO UPDATE SET
            wrong_count = excluded.wrong_count,
            correct_count = excluded.correct_count,
            mistakes = excluded.mistakes,
            timestamp = excluded.timestamp,
            mode = excluded.mode
        `)

        const batchWord = recordsToUpsert.map((r) =>
          stmtWord.bind(
            userId,
            r.word,
            r.dict,
            r.chapter,
            r.wrongCount,
            r.correctCount,
            JSON.stringify(r.mistakes || {}),
            r.timeStamp,
            r.mode || 'typing',
          ),
        )
        await env.DB.batch(batchWord)
      }
    }

    // 3. Chapter Records
    if (Array.isArray(chapterRecords) && chapterRecords.length > 0) {
      const stmtChapter = env.DB.prepare(`
        INSERT INTO chapter_records (user_id, dict, chapter, timestamp, time, correct_count, wrong_count, word_count, correct_word_indexes, word_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, dict, chapter, timestamp) DO NOTHING
      `)

      const batchChapter = chapterRecords.map((r) =>
        stmtChapter.bind(
          userId,
          r.dict,
          r.chapter,
          r.timeStamp,
          r.time,
          r.correctCount,
          r.wrongCount,
          r.wordCount,
          JSON.stringify(r.correctWordIndexes || []),
          r.wordNumber,
        ),
      )
      await env.DB.batch(batchChapter)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
