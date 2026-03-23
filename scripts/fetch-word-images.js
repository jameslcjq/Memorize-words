#!/usr/bin/env node

/**
 * 从 Pixabay 搜索并下载英语单词的实物图片
 *
 * 用法:
 *   PIXABAY_API_KEY=your_key node scripts/fetch-word-images.js [file1.json file2.json ...]
 *
 * 不传文件参数时，默认处理所有词库 JSON。
 *
 * 重新下载指定单词的图片（删除旧图后重新搜索）:
 *   PIXABAY_API_KEY=your_key node scripts/fetch-word-images.js --redo cat,dog,fox
 *
 * 可选环境变量:
 *   R2_PUBLIC_URL - R2 公开访问域名，用于写入 image 字段（如 https://word-images.your-domain.com）
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY
if (!PIXABAY_API_KEY) {
  console.error('请设置环境变量 PIXABAY_API_KEY')
  process.exit(1)
}

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const IMAGES_DIR = path.resolve(PUBLIC_DIR, 'images/words')

// 所有词库文件（默认）
const ALL_DICT_FILES = [
  'yilin_3a.json',
  'yilin_3b.json',
  'yilin_4a.json',
  'yilin_5a.json',
  'yilin_6a.json',
  'yilin_7a.json',
  'yilin_8a.json',
  'yilin_9a.json',
  '926.json',
]

// 抽象词/虚词/代词/语气词 —— 不适合配实物图片
const SKIP_WORDS = new Set([
  'i', 'am', 'is', 'are', 'a', 'an', 'the', 'my', 'your', 'you', 'we', 'he', 'she', 'it', 'me',
  'no', 'not', 'yes', 'and', 'but', 'or', 'in', 'with', 'for', 'to', 'of', 'at', 'on', 'by',
  'what', 'who', 'how', 'this', 'that', 'these', 'those', 'some', 'many', 'too', 'now',
  'oh', 'ah', 'ha', 'er', 'wow', 'hmm', 'uh', 'um',
  'can', 'do', 'did', 'does', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'shall', 'may', 'might', 'must',
  'ok', 'please', 'here', 'there', 'then', 'than', 'very', 'much', 'also', 'just', 'only',
  'mr', 'miss', 'mrs', 'ms',
  'its', 'his', 'her', 'our', 'their', 'us', 'them', 'him',
  'be', 'been', 'being', 'was', 'were',
  'if', 'so', 'as', 'up', 'out', 'off', 'into', 'from', 'about', 'over', 'after', 'before',
  'when', 'where', 'why', 'which', 'while',
  'more', 'most', 'other', 'another', 'each', 'every', 'all', 'both', 'any', 'few',
  'own', 'such', 'still', 'even', 'again', 'back', 'well', 'away', 'quite',
  'really', 'already', 'perhaps', 'enough', 'either', 'neither', 'however', 'although',
  'because', 'since', 'until', 'unless', 'whether',
  'between', 'among', 'through', 'during', 'without', 'against', 'within',
  'itself', 'himself', 'herself', 'myself', 'yourself', 'ourselves', 'themselves',
  'not only', 'but also', 'as well as', 'instead of', 'according to',
])

// 含多个单词的短语，通常不好搜图
function isPhrase(name) {
  return name.includes(' ') && name.split(' ').length > 2
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve, reject)
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString()}`))
        } else {
          resolve({ data: Buffer.concat(chunks), contentType: res.headers['content-type'] })
        }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function searchPixabay(query) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&safesearch=true`
  const { data } = await httpsGet(url)
  const result = JSON.parse(data.toString())
  return result.hits || []
}

async function downloadImage(url, filepath) {
  const { data } = await httpsGet(url)
  fs.writeFileSync(filepath, data)
}

function getImageFilename(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '.jpg'
}

async function processFile(jsonPath) {
  const fileName = path.basename(jsonPath)
  console.log(`\n========== 处理: ${fileName} ==========`)

  const words = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  // 去重
  const seen = new Set()
  const uniqueWords = []
  for (const w of words) {
    const key = w.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      uniqueWords.push(w)
    }
  }

  const results = [] // { word, filename }
  let downloaded = 0
  let skipped = 0

  for (const wordObj of uniqueWords) {
    const wordLower = wordObj.name.toLowerCase()

    if (SKIP_WORDS.has(wordLower) || isPhrase(wordObj.name)) {
      skipped++
      continue
    }

    const filename = getImageFilename(wordObj.name)
    const filepath = path.join(IMAGES_DIR, filename)

    // 如果图片已存在则跳过
    if (fs.existsSync(filepath)) {
      results.push({ word: wordObj.name, filename })
      continue
    }

    try {
      const hits = await searchPixabay(wordObj.name)

      if (hits.length === 0) {
        console.log(`  ❌ 未找到: ${wordObj.name}`)
        skipped++
        await sleep(600)
        continue
      }

      const imageUrl = hits[0].webformatURL
      console.log(`  ⬇ ${wordObj.name} -> ${filename}`)
      await downloadImage(imageUrl, filepath)
      results.push({ word: wordObj.name, filename })
      downloaded++

      await sleep(800)
    } catch (err) {
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        console.log(`  ⏳ 触发频率限制，等待 60 秒...`)
        await sleep(60000)
        // 重试一次
        try {
          const hits = await searchPixabay(wordObj.name)
          if (hits.length > 0) {
            await downloadImage(hits[0].webformatURL, filepath)
            results.push({ word: wordObj.name, filename })
            downloaded++
            console.log(`  ⬇ (重试成功) ${wordObj.name}`)
          }
        } catch (_) {
          skipped++
        }
      } else {
        console.error(`  ❌ 错误 (${wordObj.name}): ${err.message}`)
        skipped++
      }
      await sleep(1000)
    }
  }

  // 更新 JSON
  const imageMap = new Map(results.map((r) => [r.word.toLowerCase(), r.filename]))

  const updatedWords = words.map((w) => {
    const filename = imageMap.get(w.name.toLowerCase())
    if (filename) {
      const imageUrl = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL}/${filename}`
        : `/images/words/${filename}`
      return { ...w, image: imageUrl }
    }
    return w
  })

  fs.writeFileSync(jsonPath, JSON.stringify(updatedWords, null, 2) + '\n')

  console.log(`  完成: 下载 ${downloaded}, 跳过 ${skipped}, 有图 ${results.length}/${words.length}`)
  return { downloaded, skipped, withImage: results.length, total: words.length }
}

async function redoWords(wordList) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })

  const words = wordList.split(',').map((w) => w.trim()).filter(Boolean)
  console.log(`重新下载 ${words.length} 个单词的图片...\n`)

  for (const word of words) {
    const filename = getImageFilename(word)
    const filepath = path.join(IMAGES_DIR, filename)

    // 删除旧图片
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
      console.log(`🗑 已删除: ${filename}`)
    }

    try {
      const hits = await searchPixabay(word)
      if (hits.length === 0) {
        console.log(`❌ 未找到: ${word}`)
        continue
      }
      const imageUrl = hits[0].webformatURL
      console.log(`⬇ ${word} -> ${filename}`)
      await downloadImage(imageUrl, filepath)
      await sleep(800)
    } catch (err) {
      console.error(`❌ 错误 (${word}): ${err.message}`)
      await sleep(1000)
    }
  }

  // 更新所有词库 JSON 中对应词条
  for (const dictFile of ALL_DICT_FILES) {
    const jsonPath = path.join(PUBLIC_DIR, dictFile)
    if (!fs.existsSync(jsonPath)) continue

    const dictWords = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    let changed = false

    const updatedWords = dictWords.map((w) => {
      const filename = getImageFilename(w.name)
      const filepath = path.join(IMAGES_DIR, filename)
      if (words.some((rw) => rw.toLowerCase() === w.name.toLowerCase())) {
        if (fs.existsSync(filepath)) {
          const imageUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${filename}` : `/images/words/${filename}`
          changed = true
          return { ...w, image: imageUrl }
        } else {
          // 图片没下载成功，移除 image 字段
          const { image, ...rest } = w
          if (image) changed = true
          return rest
        }
      }
      return w
    })

    if (changed) {
      fs.writeFileSync(jsonPath, JSON.stringify(updatedWords, null, 2) + '\n')
      console.log(`✔ 已更新: ${dictFile}`)
    }
  }

  console.log('\n完成!')
}

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })

  const args = process.argv.slice(2)

  // --redo 模式：重新下载指定单词
  const redoIndex = args.indexOf('--redo')
  if (redoIndex !== -1) {
    const wordList = args[redoIndex + 1]
    if (!wordList) {
      console.error('用法: --redo cat,dog,fox')
      process.exit(1)
    }
    return redoWords(wordList)
  }

  // 正常模式
  const files = args.length > 0
    ? args.map((f) => path.resolve(PUBLIC_DIR, f))
    : ALL_DICT_FILES.map((f) => path.join(PUBLIC_DIR, f))

  let totalDownloaded = 0
  let totalWithImage = 0
  let totalWords = 0

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`跳过不存在的文件: ${file}`)
      continue
    }
    const stats = await processFile(file)
    totalDownloaded += stats.downloaded
    totalWithImage += stats.withImage
    totalWords += stats.total
  }

  console.log('\n========== 全部完成 ==========')
  console.log(`新下载: ${totalDownloaded} 张`)
  console.log(`有图词条: ${totalWithImage}/${totalWords}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
