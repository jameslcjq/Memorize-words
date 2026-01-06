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
      'SELECT date, duration, word_count as wordCount, updated_at as updatedAt FROM study_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // Fetch Word Records
    const { results: wordRecords } = await env.DB.prepare(
      'SELECT word, dict, chapter, wrong_count as wrongCount, correct_count as correctCount, mistakes, timestamp as timeStamp, mode FROM word_records WHERE user_id = ?'
    )
      .bind(userId)
      .all()

    // Fetch Chapter Records
    const { results: chapterRecords } = await env.DB.prepare(
      'SELECT dict, chapter, timestamp as timeStamp, time, correct_count as correctCount, wrong_count as wrongCount, word_count as wordCount, correct_word_indexes, word_number as wordNumber FROM chapter_records WHERE user_id = ?'
    )
      .bind(userId)
      .all()

    // Parse JSON fields
    const parsedWordRecords = wordRecords.map((r: any) => ({
      ...r,
      mistakes: r.mistakes ? JSON.parse(r.mistakes) : {},
    }))

    const parsedChapterRecords = chapterRecords.map((r: any) => ({
      ...r,
      correctWordIndexes: r.correct_word_indexes ? JSON.parse(r.correct_word_indexes) : [],
    }))

    return new Response(JSON.stringify({
      success: true,
      data: results,
      wordRecords: parsedWordRecords,
      chapterRecords: parsedChapterRecords
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
