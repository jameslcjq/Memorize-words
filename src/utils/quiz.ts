import shuffle from './shuffle'
import type { Word } from '@/typings'

/**
 * 从词库中为目标词汇生成干扰项
 * @param targetWord 目标词汇
 * @param allWords 词库中所有可用词汇
 * @param count 干扰项数量
 * @param field 干扰项展示的字段 ('name' 或 'trans')
 * @returns 包含正确答案和干扰项的洗牌后的数组
 */
export function generateQuizOptions<T extends 'name' | 'trans'>(targetWord: Word, allWords: Word[], count = 3, field: T) {
  // 过滤掉目标词本身
  const otherWords = allWords.filter((w) => w.name !== targetWord.name)

  // 简单采样：随机洗牌后取前 count 个
  // 进阶：可以根据拼写相近度或词义相关度进行过滤
  const distractors = shuffle(otherWords)
    .slice(0, count)
    .map((w) => (field === 'trans' ? w.trans.join('；') : w.name))

  const correctAnswer = field === 'trans' ? targetWord.trans.join('；') : targetWord.name

  return shuffle([correctAnswer, ...distractors])
}
