import { errorResponse, requireAuth } from '../../auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

type StudyRecordPayload = {
  date: string
  duration?: number
  wordCount?: number
}

type WordRecordPayload = {
  word: string
  dict: string
  chapter?: number | null
  wrongCount?: number
  correctCount?: number
  mistakes?: unknown
  timeStamp?: number
  mode?: string
  deletedAt?: number
}

type DeletedWordRecordPayload = {
  word: string
  dict: string
  deletedAt: number
}

type ChapterRecordPayload = {
  dict: string
  chapter?: number | null
  timeStamp: number
  time?: number
  correctCount?: number
  wrongCount?: number
  wordCount?: number
  correctWordIndexes?: number[]
  wordNumber?: number
}

type PointsTransactionPayload = {
  amount: number
  reason: string
  timestamp: number
  details?: string
}

type UnlockedAchievementPayload = {
  achievementId: string
  unlockedAt: number
}

type DailyChallengePayload = {
  date: string
  completedAt?: number
  words?: unknown[]
  score?: number
}

type ReviewRecordPayload = {
  dict: string
  createTime: number
  isFinished?: boolean
}

type SpacedRepetitionPayload = {
  word: string
  dict: string
  easinessFactor?: number
  easeFactor?: number
  interval?: number
  intervalDays?: number
  repetitions?: number
  nextReviewDate?: number
  nextReview?: number
  lastReviewDate?: number
  lastReviewed?: number
}

type SmartLearningPayload = {
  dict: string
  chapter: number
  groupNumber: number
  wordsCount: number
  totalTime: number
  completedAt: number
  wordDetails?: unknown
}

type PetPayload = {
  species: string
  name: string
  level: number
  exp: number
  stage: string
  mood: number
  hunger: number
  cleanliness: number
  outfitJson?: string
  lastInteractedAt: number
  createdAt: number
  color?: string
}

type PetInventoryPayload = {
  itemId: string
  quantity: number
}

type SyncUploadBody = {
  records?: StudyRecordPayload[]
  wordRecords?: WordRecordPayload[]
  deletedWordRecords?: DeletedWordRecordPayload[]
  chapterRecords?: ChapterRecordPayload[]
  pointsTransactions?: PointsTransactionPayload[]
  unlockedAchievements?: UnlockedAchievementPayload[]
  dailyChallenges?: DailyChallengePayload[]
  reviewRecords?: ReviewRecordPayload[]
  spacedRepetitionRecords?: SpacedRepetitionPayload[]
  smartLearningRecords?: SmartLearningPayload[]
  pet?: PetPayload | null
  petInventory?: PetInventoryPayload[]
  userSettings?: Record<string, string | null>
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const user = await requireAuth(request, env)
    const body = (await request.json()) as SyncUploadBody
    const userId = user.sub
    const records = Array.isArray(body.records) ? body.records : []

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
    const wordRecords = Array.isArray(body.wordRecords) ? body.wordRecords : []
    const deletedWordRecords = Array.isArray(body.deletedWordRecords) ? body.deletedWordRecords : []
    const chapterRecords = Array.isArray(body.chapterRecords) ? body.chapterRecords : []

    const recordsToDelete: DeletedWordRecordPayload[] = [
      ...deletedWordRecords,
      ...wordRecords
        .filter((r) => (r.correctCount || 0) >= 3)
        .map((r) => ({
          word: r.word,
          dict: r.dict,
          deletedAt: r.deletedAt || r.timeStamp || Math.floor(Date.now() / 1000),
        })),
    ]

    if (recordsToDelete.length > 0) {
      const stmtTombstone = env.DB.prepare(`
        INSERT INTO deleted_word_records (user_id, word, dict, deleted_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, dict, word) DO UPDATE SET
          deleted_at = MAX(deleted_word_records.deleted_at, excluded.deleted_at)
      `)
      await env.DB.batch(recordsToDelete.map((r) => stmtTombstone.bind(userId, r.word, r.dict, r.deletedAt)))

      const stmtDelete = env.DB.prepare(`
        DELETE FROM word_records
        WHERE user_id = ? AND word = ? AND dict = ?
          AND (timestamp IS NULL OR timestamp <= ?)
      `)
      await env.DB.batch(recordsToDelete.map((r) => stmtDelete.bind(userId, r.word, r.dict, r.deletedAt)))
    }

    if (wordRecords.length > 0) {
      // Split records: delete if correctCount >= 3, otherwise upsert
      const recordsToUpsert = wordRecords.filter((r) => (r.correctCount || 0) < 3)

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
          WHERE excluded.timestamp >= COALESCE(word_records.timestamp, 0)
        `)

        const batchWord = recordsToUpsert.map((r) =>
          stmtWord.bind(
            userId,
            r.word,
            r.dict,
            r.chapter ?? null,
            r.wrongCount || 0,
            r.correctCount || 0,
            JSON.stringify(r.mistakes || {}),
            r.timeStamp || Math.floor(Date.now() / 1000),
            r.mode || 'typing',
          ),
        )
        await env.DB.batch(batchWord)
      }
    }

    await env.DB.prepare(
      `
      DELETE FROM word_records
      WHERE user_id = ?
        AND EXISTS (
          SELECT 1 FROM deleted_word_records d
          WHERE d.user_id = word_records.user_id
            AND d.word = word_records.word
            AND d.dict = word_records.dict
            AND d.deleted_at >= word_records.timestamp
        )
    `,
    )
      .bind(userId)
      .run()

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
    const pointsTransactions = Array.isArray(body.pointsTransactions) ? body.pointsTransactions : []
    if (Array.isArray(pointsTransactions) && pointsTransactions.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO points_transactions (user_id, amount, reason, timestamp, details)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, timestamp, reason, amount) DO NOTHING
      `)
      const batch = pointsTransactions.map((t) => stmt.bind(userId, t.amount, t.reason, t.timestamp, t.details || null))
      await env.DB.batch(batch)
    }

    // 5. Gamification - Unlocked Achievements
    const unlockedAchievements = Array.isArray(body.unlockedAchievements) ? body.unlockedAchievements : []
    if (Array.isArray(unlockedAchievements) && unlockedAchievements.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO unlocked_achievements (user_id, achievement_id, unlocked_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, achievement_id) DO NOTHING
      `)
      const batch = unlockedAchievements.map((a) => stmt.bind(userId, a.achievementId, a.unlockedAt))
      await env.DB.batch(batch)
    }

    // 6. Gamification - Daily Challenges
    const dailyChallenges = Array.isArray(body.dailyChallenges) ? body.dailyChallenges : []
    if (Array.isArray(dailyChallenges) && dailyChallenges.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO daily_challenges (user_id, date, completed_at, words, score)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET
          completed_at = excluded.completed_at,
          words = excluded.words,
          score = excluded.score
      `)
      const batch = dailyChallenges.map((c) =>
        stmt.bind(userId, c.date, c.completedAt || null, JSON.stringify(c.words || []), c.score || 0),
      )
      await env.DB.batch(batch)
    }

    // 7. Review Records
    const reviewRecords = Array.isArray(body.reviewRecords) ? body.reviewRecords : []
    if (Array.isArray(reviewRecords) && reviewRecords.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO review_records (user_id, dict, create_time, is_finished)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, dict, create_time) DO UPDATE SET
          is_finished = excluded.is_finished
      `)
      const batch = reviewRecords.map((r) => stmt.bind(userId, r.dict, r.createTime, r.isFinished ? 1 : 0))
      await env.DB.batch(batch)
    }

    // 8. Spaced Repetition Records
    const spacedRepetitionRecords = Array.isArray(body.spacedRepetitionRecords) ? body.spacedRepetitionRecords : []
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
      const batch = spacedRepetitionRecords.map((r) =>
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
    const smartLearningRecords = Array.isArray(body.smartLearningRecords) ? body.smartLearningRecords : []
    if (Array.isArray(smartLearningRecords) && smartLearningRecords.length > 0) {
      const stmt = env.DB.prepare(`
        INSERT INTO smart_learning_records (user_id, dict, chapter, group_number, words_count, total_time, completed_at, word_details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, dict, chapter, group_number, completed_at) DO NOTHING
      `)
      const batch = smartLearningRecords.map((r) =>
        stmt.bind(userId, r.dict, r.chapter, r.groupNumber, r.wordsCount, r.totalTime, r.completedAt, JSON.stringify(r.wordDetails)),
      )
      await env.DB.batch(batch)
    }

    // 10. Pet Data
    const pet = body.pet
    const petInventory = Array.isArray(body.petInventory) ? body.petInventory : undefined
    if (Object.prototype.hasOwnProperty.call(body, 'pet')) {
      if (pet) {
        await env.DB.prepare(
          `
          INSERT INTO pets (user_id, species, name, level, exp, stage, mood, hunger, cleanliness, outfit_json, last_interacted_at, created_at, color, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            species = excluded.species,
            name = excluded.name,
            level = excluded.level,
            exp = excluded.exp,
            stage = excluded.stage,
            mood = excluded.mood,
            hunger = excluded.hunger,
            cleanliness = excluded.cleanliness,
            outfit_json = excluded.outfit_json,
            last_interacted_at = excluded.last_interacted_at,
            color = excluded.color,
            updated_at = excluded.updated_at
        `,
        )
          .bind(
            userId,
            pet.species,
            pet.name,
            pet.level,
            pet.exp,
            pet.stage,
            pet.mood,
            pet.hunger,
            pet.cleanliness,
            pet.outfitJson || '[]',
            pet.lastInteractedAt,
            pet.createdAt,
            pet.color || 'natural',
            Date.now(),
          )
          .run()
      } else {
        await env.DB.prepare('DELETE FROM pets WHERE user_id = ?').bind(userId).run()
      }
    }

    if (Array.isArray(petInventory)) {
      await env.DB.prepare('DELETE FROM pet_inventory WHERE user_id = ?').bind(userId).run()

      if (petInventory.length > 0) {
        const stmt = env.DB.prepare(`
          INSERT INTO pet_inventory (user_id, item_id, quantity, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, item_id) DO UPDATE SET
            quantity = excluded.quantity,
            updated_at = excluded.updated_at
        `)
        const batch = petInventory.map((item) => stmt.bind(userId, item.itemId, item.quantity, Date.now()))
        await env.DB.batch(batch)
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'userSettings')) {
      await env.DB.prepare(
        `
        INSERT INTO user_settings (user_id, settings, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          settings = excluded.settings,
          updated_at = excluded.updated_at
      `,
      )
        .bind(userId, JSON.stringify(body.userSettings || {}), Date.now())
        .run()
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
