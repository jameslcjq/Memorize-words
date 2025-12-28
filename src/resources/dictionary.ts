import type { Dictionary, DictionaryResource } from '@/typings/index'
import { calcChapterCount } from '@/utils'

export const dictionaryResources: DictionaryResource[] = [
  {
    id: 'Yilin3A',
    name: '译林版小学英语3A',
    description: '译林版3A词汇',
    category: '英语',
    tags: ['小学', '译林版'],
    url: '/yilin_3a.json',
    length: 126,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [12, 11, 17, 9, 18, 12, 31, 16],
  },
  {
    id: 'Yilin4A',
    name: '译林版小学英语4A',
    description: '译林版4A词汇',
    category: '英语',
    tags: ['小学', '译林版'],
    url: '/yilin_4a.json',
    length: 159,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [23, 26, 24, 13, 20, 18, 19, 16],
  },
  {
    id: 'Yilin5A',
    name: '译林版小学英语5A',
    description: '译林版5A词汇',
    category: '英语',
    tags: ['小学', '译林版'],
    url: '/yilin_5a.json',
    length: 148,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [20, 14, 11, 19, 17, 21, 15, 31],
  },
  {
    id: 'Yilin6A',
    name: '译林版小学英语6A',
    description: '译林版6A词汇',
    category: '英语',
    tags: ['小学', '译林版'],
    url: '/yilin_6a.json',
    length: 166,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [21, 24, 18, 24, 22, 19, 23, 15],
  },
  {
    id: 'Yilin7A',
    name: '译林版初中英语7A',
    description: '译林版7A词汇',
    category: '英语',
    tags: ['初中', '译林版'],
    url: '/yilin_7a.json',
    length: 417,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [40, 46, 47, 54, 54, 56, 62, 58],
  },
  {
    id: 'Yilin8A',
    name: '译林版初中英语8A',
    description: '译林版8A词汇',
    category: '英语',
    tags: ['初中', '译林版'],
    url: '/yilin_8a.json',
    length: 452,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [55, 56, 64, 56, 54, 50, 55, 62],
  },
  {
    id: 'Yilin9A',
    name: '译林版初中英语9A',
    description: '译林版9A词汇',
    category: '英语',
    tags: ['初中', '译林版'],
    url: '/yilin_9a.json',
    length: 760,
    language: 'en',
    languageCategory: 'en',
    chapterLengths: [65, 34, 33, 45, 48, 4, 59, 56, 55, 73, 39, 3, 32, 69, 43, 44, 51, 7],
  },
]

export const dictionaries: Dictionary[] = dictionaryResources.map((resource) => ({
  ...resource,
  chapterCount: resource.chapterLengths ? resource.chapterLengths.length : calcChapterCount(resource.length),
}))

/**
 * An object-map from dictionary IDs to dictionary themselves.
 */
export const idDictionaryMap: Record<string, Dictionary> = Object.fromEntries(dictionaries.map((dict) => [dict.id, dict]))
