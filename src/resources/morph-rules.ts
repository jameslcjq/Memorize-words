import type { Word } from '@/typings'

export type AffixRule = { text: string; meaning: string }

export const PREFIX_RULES: AffixRule[] = [
  { text: 'un', meaning: '不；相反' },
  { text: 're', meaning: '再次；重新' },
  { text: 'dis', meaning: '不；分开' },
]

export const SUFFIX_RULES: AffixRule[] = [
  { text: 'tion', meaning: '行为或结果' },
  { text: 'less', meaning: '没有…的' },
  { text: 'ful', meaning: '充满…的' },
  { text: 'ing', meaning: '正在…；动作' },
  { text: 'ed', meaning: '已经…；过去的' },
  { text: 'er', meaning: '做…的人或物' },
  { text: 'or', meaning: '做…的人或物' },
  { text: 'ly', meaning: '以…方式' },
  { text: 'y', meaning: '有…特征的' },
]

export const PHONICS_RULES = [
  'a_e',
  'i_e',
  'o_e',
  'igh',
  'sh',
  'ch',
  'th',
  'wh',
  'ck',
  'oo',
  'ee',
  'ea',
  'ai',
  'ay',
  'oa',
  'ar',
  'or',
  'er',
] as const

export const COMMON_WORD_FAMILIES = [
  '-ake',
  '-ame',
  '-ate',
  '-ight',
  '-ook',
  '-ool',
  '-ain',
  '-ay',
  '-eat',
  '-ell',
  '-ing',
  '-ock',
  '-op',
  '-an',
  '-at',
  '-en',
  '-it',
  '-ug',
] as const

const ROOT_MEANINGS: Record<string, string> = {
  teach: '教',
  help: '帮助',
  care: '关心',
  hope: '希望',
  use: '使用',
  work: '工作',
  play: '玩；表演',
  read: '读',
  write: '写',
  quick: '快',
  slow: '慢',
  color: '颜色',
  colour: '颜色',
  friend: '朋友',
  home: '家',
}

function primaryToken(name: string): string {
  const tokens: string[] = name.toLowerCase().match(/[a-z]+/g) ?? []
  return tokens.reduce((longest, token) => (token.length > longest.length ? token : longest), '')
}

export function detectPhonics(name: string): string[] {
  const token = primaryToken(name)
  if (!token) return []
  const points = new Set<string>()
  if (/a[a-z]e$/.test(token) && !token.includes('ar') && !['have', 'are', 'care'].includes(token)) points.add('a_e')
  if (/i[a-z]e$/.test(token) && !token.includes('ir') && !['give', 'live'].includes(token)) points.add('i_e')
  if (
    /o[a-z]e$/.test(token) &&
    !token.includes('or') &&
    !['love', 'come', 'some', 'done', 'none', 'one', 'move', 'glove', 'above', 'welcome', 'become', 'awesome'].includes(token)
  ) {
    points.add('o_e')
  }
  for (const point of PHONICS_RULES) {
    if (point.includes('_')) continue
    if (point === 'ch' && token.includes('sch')) continue
    if (token.includes(point)) points.add(point)
  }
  return [...points]
}

export function detectWordFamily(name: string): string | undefined {
  const token = primaryToken(name)
  if (token.length < 3) return undefined
  const known = COMMON_WORD_FAMILIES.find((family) => token.endsWith(family.slice(1)))
  if (known) return known
  return `-${token.slice(token.length >= 5 ? -3 : -2)}`
}

export function detectMorph(name: string): Word['morph'] | undefined {
  const token = primaryToken(name)
  if (token.length < 4) return undefined
  const prefixCandidate = PREFIX_RULES.find((rule) => token.startsWith(rule.text) && token.length > rule.text.length + 2)
  const suffixCandidate = SUFFIX_RULES.find((rule) => token.endsWith(rule.text) && token.length > rule.text.length + 2)
  const rootText = token.slice(prefixCandidate?.text.length || 0, suffixCandidate ? -suffixCandidate.text.length : undefined)
  const rootMeaning = ROOT_MEANINGS[rootText]
  const prefix = rootMeaning ? prefixCandidate : undefined
  const safeProductiveSuffixes = new Set(['tion', 'less', 'ful', 'ing', 'ed', 'ly'])
  const suffix = rootMeaning || (suffixCandidate && safeProductiveSuffixes.has(suffixCandidate.text)) ? suffixCandidate : undefined
  if (!prefix && !suffix) return undefined
  return {
    ...(prefix ? { prefix } : {}),
    ...(rootMeaning ? { root: { text: rootText, meaning: rootMeaning } } : {}),
    ...(suffix ? { suffix } : {}),
  }
}

export function enrichWordLearningData(word: Word): Word {
  const phonics = word.phonics?.length ? word.phonics : detectPhonics(word.name)
  return {
    ...word,
    ...(phonics.length ? { phonics } : {}),
    wordFamily: word.wordFamily || detectWordFamily(word.name),
    morph: word.morph || detectMorph(word.name),
  }
}
