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

    // 4. Gamification - Points Transactions
    const { pointsTransactions } = body as any
    if (Array.isArray(pointsTransactions) && pointsTransactions.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO points_transactions (user_id, amount, reason, timestamp, details)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, timestamp, reason, amount) DO NOTHING
      `)
      const batch = pointsTransactions.map((t: any) => stmt.bind(userId, t.amount, t.reason, t.timestamp, t.details || null))
      await env.DB.batch(batch)
    }

    // 5. Gamification - Unlocked Achievements
    const { unlockedAchievements } = body as any
    if (Array.isArray(unlockedAchievements) && unlockedAchievements.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO unlocked_achievements (user_id, achievement_id, unlocked_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, achievement_id) DO NOTHING
      `)
      const batch = unlockedAchievements.map((a: any) => stmt.bind(userId, a.achievementId, a.unlockedAt))
      await env.DB.batch(batch)
    }

    // 6. Gamification - Daily Challenges
    const { dailyChallenges } = body as any
    if (Array.isArray(dailyChallenges) && dailyChallenges.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO daily_challenges (user_id, date, completed_at, words, score)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
          completed_at = excluded.completed_at,
          words = excluded.words,
          score = excluded.score
      `)
      const batch = dailyChallenges.map((c: any) =>
        stmt.bind(userId, c.date, c.completedAt || null, JSON.stringify(c.words || []), c.score || 0),
      )
      await env.DB.batch(batch)
    }

    // 7. Review Records
    const { reviewRecords } = body as any
    if (Array.isArray(reviewRecords) && reviewRecords.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO review_records (user_id, dict, create_time, is_finished)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, dict, create_time) DO UPDATE SET
          is_finished = excluded.is_finished
      `)
      const batch = reviewRecords.map((r: any) => stmt.bind(userId, r.dict, r.createTime, r.isFinished ? 1 : 0))
      await env.DB.batch(batch)
    }

    // 8. Spaced Repetition Records
    const { spacedRepetitionRecords } = body as any
    if (Array.isArray(spacedRepetitionRecords) && spacedRepetitionRecords.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO spaced_repetition_records (user_id, word, dict, ease_factor, interval_days, repetitions, next_review, last_reviewed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, word, dict) DO UPDATE SET
          ease_factor = excluded.ease_factor,
          interval_days = excluded.interval_days,
          repetitions = excluded.repetitions,
          next_review = excluded.next_review,
          last_reviewed = excluded.last_reviewed
      `)
      const batch = spacedRepetitionRecords.map((r: any) =>
        stmt.bind(
          userId,
          r.word,
          r.dict,
          r.easinessFactor || r.easeFactor || 2.5,
          r.interval || r.intervalDays || 0,
          r.repetitions || 0,
          r.nextReviewDate || r.nextReview || 0,
          r.lastReviewDate || r.lastReviewed || 0,
        ),
      )
      await env.DB.batch(batch)
    }

    // 9. Smart Learning Records
    const { smartLearningRecords } = body as any
    if (Array.isArray(smartLearningRecords) && smartLearningRecords.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO smart_learning_records (user_id, dict, chapter, group_number, words_count, total_time, completed_at, word_details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, dict, chapter, group_number, completed_at) DO NOTHING
      `)
      const batch = smartLearningRecords.map((r: any) =>
        stmt.bind(userId, r.dict, r.chapter, r.groupNumber, r.wordsCount, r.totalTime, r.completedAt, JSON.stringify(r.wordDetails)),
      )
      await env.DB.batch(batch)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
