import { errorResponse, requireAuth } from '../../auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

type JsonMap = Record<string, unknown>

type WordRecordRow = {
  word: string
  dict: string
  chapter: number | null
  wrongCount: number
  correctCount: number
  mistakes?: string | null
  timeStamp: number
  mode?: string | null
}

type ChapterRecordRow = {
  dict: string
  chapter: number | null
  timeStamp: number
  time: number
  correctCount: number
  wrongCount: number
  wordCount: number
  correct_word_indexes?: string | null
  wordNumber: number
}

type DailyChallengeRow = {
  date: string
  completedAt?: number | null
  words?: string | null
  score?: number | null
}

type ReviewRecordRow = {
  dict: string
  createTime: number
  isFinished: number
}

type SmartLearningRow = {
  dict: string
  chapter: number
  groupNumber: number
  wordsCount: number
  totalTime: number
  completedAt: number
  wordDetails?: string | null
}

type PetRow = {
  species: string
  name: string
  level: number
  exp: number
  stage: string
  mood: number
  hunger: number
  cleanliness: number
  outfitJson: string
  lastInteractedAt: number
  createdAt: number
}

type UserSettingsRow = {
  settings?: string | null
}

function parseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const user = await requireAuth(request, env)
    const userId = user.sub

    // 1. Study Records (legacy)
    const { results } = await env.DB.prepare(
      'SELECT date, duration, word_count as wordCount, updated_at as updatedAt FROM study_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    // 2. Word Records
    const { results: wordRecords } = await env.DB.prepare(
      `
      SELECT wr.word, wr.dict, wr.chapter, wr.wrong_count as wrongCount, wr.correct_count as correctCount, wr.mistakes, wr.timestamp as timeStamp, wr.mode
      FROM word_records wr
      LEFT JOIN deleted_word_records d
        ON d.user_id = wr.user_id AND d.word = wr.word AND d.dict = wr.dict
      WHERE wr.user_id = ? AND (d.deleted_at IS NULL OR wr.timestamp > d.deleted_at)
    `,
    )
      .bind(userId)
      .all<WordRecordRow>()

    // 3. Chapter Records
    const { results: chapterRecords } = await env.DB.prepare(
      'SELECT dict, chapter, timestamp as timeStamp, time, correct_count as correctCount, wrong_count as wrongCount, word_count as wordCount, correct_word_indexes, word_number as wordNumber FROM chapter_records WHERE user_id = ?',
    )
      .bind(userId)
      .all<ChapterRecordRow>()

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
      .all<DailyChallengeRow>()

    // 7. Review Records
    const { results: reviewRecords } = await env.DB.prepare(
      'SELECT dict, create_time as createTime, is_finished as isFinished FROM review_records WHERE user_id = ?',
    )
      .bind(userId)
      .all<ReviewRecordRow>()

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
      .all<SmartLearningRow>()

    // 10. Pet Data
    const petRow = await env.DB.prepare(
      'SELECT species, name, level, exp, stage, mood, hunger, cleanliness, outfit_json as outfitJson, last_interacted_at as lastInteractedAt, created_at as createdAt FROM pets WHERE user_id = ?',
    )
      .bind(userId)
      .first<PetRow>()

    const { results: petInventory } = await env.DB.prepare(
      'SELECT item_id as itemId, quantity FROM pet_inventory WHERE user_id = ? AND quantity > 0',
    )
      .bind(userId)
      .all()

    const { results: deletedWordRecords } = await env.DB.prepare(
      'SELECT word, dict, deleted_at as deletedAt FROM deleted_word_records WHERE user_id = ?',
    )
      .bind(userId)
      .all()

    const userSettingsRow = await env.DB.prepare('SELECT settings FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first<UserSettingsRow>()

    // Parse JSON fields
    const parsedWordRecords = wordRecords.map((r) => ({
      ...r,
      mistakes: parseJson(r.mistakes, {}) as JsonMap,
    }))

    const parsedChapterRecords = chapterRecords.map((r) => ({
      ...r,
      correctWordIndexes: parseJson(r.correct_word_indexes, []) as number[],
    }))

    const parsedDailyChallenges = dailyChallenges.map((c) => ({
      ...c,
      words: parseJson(c.words, []) as unknown[],
    }))

    const parsedReviewRecords = reviewRecords.map((r) => ({
      ...r,
      isFinished: r.isFinished === 1,
    }))

    const parsedSmartLearningRecords = smartLearningRecords.map((r) => ({
      ...r,
      wordDetails: parseJson(r.wordDetails, []) as unknown[],
    }))

    const userSettings = parseJson(userSettingsRow?.settings, {}) as Record<string, string | null>

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
        deletedWordRecords,
        pet: petRow || null,
        petInventory: petInventory || [],
        userSettings,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    return errorResponse(err)
  }
}
