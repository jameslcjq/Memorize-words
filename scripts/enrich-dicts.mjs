import { createReadStream, promises as fs } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

// Optional phonetic source (MIT): https://github.com/skywind3000/ECDICT
// Usage: npm run enrich:dicts -- --ecdict C:\path\to\ecdict.csv

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const overridesPath = path.join(root, 'scripts', 'morph-overrides.json')
const ecdictArg = process.argv.indexOf('--ecdict')
const ecdictPath = ecdictArg >= 0 ? path.resolve(process.argv[ecdictArg + 1]) : process.env.ECDICT_CSV

const prefixRules = [
  ['un', '不；相反'],
  ['re', '再次；重新'],
  ['dis', '不；分开'],
]
const suffixRules = [
  ['tion', '行为或结果'],
  ['less', '没有…的'],
  ['ful', '充满…的'],
  ['ing', '正在…；动作'],
  ['ed', '已经…；过去的'],
  ['er', '做…的人或物'],
  ['or', '做…的人或物'],
  ['ly', '以…方式'],
  ['y', '有…特征的'],
]
const phonicsRules = ['igh', 'sh', 'ch', 'th', 'wh', 'ck', 'oo', 'ee', 'ea', 'ai', 'ay', 'oa', 'ar', 'or', 'er']
const knownFamilies = [
  'ake',
  'ame',
  'ate',
  'ight',
  'ook',
  'ool',
  'ain',
  'ay',
  'eat',
  'ell',
  'ing',
  'ock',
  'op',
  'an',
  'at',
  'en',
  'it',
  'ug',
]
const rootMeanings = {
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

function tokenOf(name) {
  const tokens =
    String(name || '')
      .toLowerCase()
      .match(/[a-z]+/g) || []
  return tokens.reduce((longest, token) => (token.length > longest.length ? token : longest), '')
}

function detectPhonics(name) {
  const token = tokenOf(name)
  const result = new Set()
  if (/a[a-z]e$/.test(token) && !token.includes('ar') && !['have', 'are', 'care'].includes(token)) result.add('a_e')
  if (/i[a-z]e$/.test(token) && !token.includes('ir') && !['give', 'live'].includes(token)) result.add('i_e')
  if (
    /o[a-z]e$/.test(token) &&
    !token.includes('or') &&
    !['love', 'come', 'some', 'done', 'none', 'one', 'move', 'glove', 'above', 'welcome', 'become', 'awesome'].includes(token)
  ) {
    result.add('o_e')
  }
  phonicsRules.forEach((point) => token.includes(point) && !(point === 'ch' && token.includes('sch')) && result.add(point))
  return [...result]
}

function detectFamily(name) {
  const token = tokenOf(name)
  if (!token) return undefined
  const known = knownFamilies.find((family) => token.endsWith(family))
  return `-${known || token.slice(token.length >= 5 ? -3 : -Math.min(2, token.length))}`
}

function detectMorph(name) {
  const token = tokenOf(name)
  if (token.length < 4) return undefined
  const prefixCandidate = prefixRules.find(([text]) => token.startsWith(text) && token.length > text.length + 2)
  const suffixCandidate = suffixRules.find(([text]) => token.endsWith(text) && token.length > text.length + 2)
  const rootText = token.slice(prefixCandidate?.[0].length || 0, suffixCandidate ? -suffixCandidate[0].length : undefined)
  const rootMeaning = rootMeanings[rootText]
  const prefix = rootMeaning ? prefixCandidate : undefined
  const suffix = rootMeaning || ['tion', 'less', 'ful', 'ing', 'ed', 'ly'].includes(suffixCandidate?.[0]) ? suffixCandidate : undefined
  if (!prefix && !suffix) return undefined
  return {
    ...(prefix ? { prefix: { text: prefix[0], meaning: prefix[1] } } : {}),
    ...(rootMeanings[rootText] ? { root: { text: rootText, meaning: rootMeanings[rootText] } } : {}),
    ...(suffix ? { suffix: { text: suffix[0], meaning: suffix[1] } } : {}),
  }
}

function parseCsvRow(line) {
  const cells = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index++
      } else quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else value += char
  }
  cells.push(value)
  return cells
}

async function loadEcdictPhones(csvPath, wanted) {
  if (!csvPath) return new Map()
  const phones = new Map()
  const input = readline.createInterface({ input: createReadStream(csvPath, { encoding: 'utf8' }), crlfDelay: Infinity })
  let wordColumn = 0
  let phoneticColumn = 1
  let first = true
  for await (const line of input) {
    const cells = parseCsvRow(line)
    if (first) {
      first = false
      wordColumn = Math.max(0, cells.indexOf('word'))
      phoneticColumn = Math.max(1, cells.indexOf('phonetic'))
      continue
    }
    const word = cells[wordColumn]?.trim().toLowerCase()
    if (!word || !wanted.has(word)) continue
    const phonetic = cells[phoneticColumn]?.trim()
    if (phonetic) phones.set(word, phonetic)
    if (phones.size === wanted.size) break
  }
  return phones
}

const dictFiles = (await fs.readdir(publicDir)).filter((name) => /^yilin_[3-9][ab]?\.json$/i.test(name)).sort()
const dictionaries = new Map()
const wanted = new Set()
for (const file of dictFiles) {
  const words = JSON.parse(await fs.readFile(path.join(publicDir, file), 'utf8'))
  dictionaries.set(file, words)
  words.forEach((word) => {
    const normalized = String(word.name || '')
      .trim()
      .toLowerCase()
    if (normalized) wanted.add(normalized)
    normalized.match(/[a-z]+/g)?.forEach((token) => wanted.add(token))
  })
}

const phones = await loadEcdictPhones(ecdictPath, wanted)
const overrides = JSON.parse(await fs.readFile(overridesPath, 'utf8'))
let changed = 0
let phoneFilled = 0

for (const [file, words] of dictionaries) {
  const enriched = words.map((word) => {
    const normalized = String(word.name || '')
      .trim()
      .toLowerCase()
    const tokenPhones =
      normalized
        .match(/[a-z]+/g)
        ?.map((token) => phones.get(token))
        .filter(Boolean) || []
    const phonetic = phones.get(normalized) || (tokenPhones.length ? tokenPhones.join(' ') : '')
    const next = {
      ...word,
      ...(!word.usphone && phonetic ? { usphone: phonetic } : {}),
      ...(!word.ukphone && phonetic ? { ukphone: phonetic } : {}),
      phonics: detectPhonics(word.name),
      wordFamily: detectFamily(word.name),
      morph: detectMorph(word.name),
      ...(overrides[normalized] || {}),
    }
    if ((!word.usphone || !word.ukphone) && phonetic) phoneFilled++
    return next
  })

  const familyGroups = new Map()
  enriched.forEach((word) => {
    if (word.wordFamily) familyGroups.set(word.wordFamily, [...(familyGroups.get(word.wordFamily) || []), word.name])
  })
  enriched.forEach((word) => {
    const relatives = (familyGroups.get(word.wordFamily) || []).filter((name) => name !== word.name).slice(0, 8)
    if (relatives.length) word.relatedWords = relatives
  })

  const before = JSON.stringify(words)
  const after = JSON.stringify(enriched)
  if (before !== after) changed++
  await fs.writeFile(path.join(publicDir, file), `${JSON.stringify(enriched, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify({ files: dictFiles.length, changed, phoneFilled, ecdict: Boolean(ecdictPath) }))
