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
    // 1. Study Records (legacy)
    const { results } = await env.DB.prepare(
      'SELECT date, duration, word_count as wordCount, updated_at as updatedAt FROM study_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 2. Word Records
    const { results: wordRecords } = await env.DB.prepare(
      'SELECT word, dict, chapter, wrong_count as wrongCount, correct_count as correctCount, mistakes, timestamp as timeStamp, mode FROM word_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 3. Chapter Records
    const { results: chapterRecords } = await env.DB.prepare(
      'SELECT dict, chapter, timestamp as timeStamp, time, correct_count as correctCount, wrong_count as wrongCount, word_count as wordCount, correct_word_indexes, word_number as wordNumber FROM chapter_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 4. Points Transactions (recent 100)
    const { results: pointsTransactions } = await env.DB.prepare(
      'SELECT amount, reason, timestamp, details FROM points_transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100',
    )
      .bind(userId)
      .all()

    // 5. Unlocked Achievements
    const { results: unlockedAchievements } = await env.DB.prepare(
      'SELECT achievement_id as achievementId, unlocked_at as unlockedAt FROM unlocked_achievements WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 6. Daily Challenges (recent 90 days)
    const { results: dailyChallenges } = await env.DB.prepare(
      'SELECT date, completed_at as completedAt, words, score FROM daily_challenges WHERE user_id = ? ORDER BY date DESC LIMIT 90',
    )
      .bind(userId)
      .all()

    // 7. Review Records
    const { results: reviewRecords } = await env.DB.prepare(
      'SELECT dict, create_time as createTime, is_finished as isFinished FROM review_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 8. Spaced Repetition Records
    const { results: spacedRepetitionRecords } = await env.DB.prepare(
      'SELECT word, dict, ease_factor as easeFactor, interval_days as intervalDays, repetitions, next_review as nextReview, last_reviewed as lastReviewed FROM spaced_repetition_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 9. Smart Learning Records
    const { results: smartLearningRecords } = await env.DB.prepare(
      'SELECT dict, chapter, group_number as groupNumber, words_count as wordsCount, total_time as totalTime, completed_at as completedAt, word_details as wordDetails FROM smart_learning_records WHERE user_id = ?',
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

    const parsedDailyChallenges = dailyChallenges.map((c: any) => ({
      ...c,
      words: c.words ? JSON.parse(c.words) : [],
    }))

    const parsedReviewRecords = reviewRecords.map((r: any) => ({
      ...r,
      isFinished: r.isFinished === 1,
    }))

    const parsedSmartLearningRecords = smartLearningRecords.map((r: any) => ({
      ...r,
      wordDetails: r.wordDetails ? JSON.parse(r.wordDetails) : [],
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        wordRecords: parsedWordRecords,
        chapterRecords: parsedChapterRecords,
        pointsTransactions,
        unlockedAchievements,
        dailyChallenges: parsedDailyChallenges,
        reviewRecords: parsedReviewRecords,
        spacedRepetitionRecords,
        smartLearningRecords: parsedSmartLearningRecords,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
