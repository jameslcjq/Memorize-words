import { db } from '.'
import { getCurrentDate, recordDataAction } from '..'

export type ExportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export type ImportProgress = {
  totalRows?: number
  completedRows: number
  done: boolean
}

export async function exportDatabaseBlob(callback?: (exportProgress: ExportProgress) => boolean) {
  const [pako, { saveAs }] = await Promise.all([import('pako'), import('file-saver'), import('dexie-export-import')])

  const blob = await db.export({
    progressCallback: (progress) => {
      return callback ? callback(progress) : true
    },
  })

  const json = await blob.text()
  const compressed = pako.gzip(json)
  return new Blob([compressed as any])
}

export async function exportDatabase(callback: (exportProgress: ExportProgress) => boolean) {
  const [{ saveAs }] = await Promise.all([import('file-saver')])
  const compressedBlob = await exportDatabaseBlob(callback)

  const [wordCount, chapterCount] = await Promise.all([db.wordRecords.count(), db.chapterRecords.count()])
  const currentDate = getCurrentDate()
  saveAs(compressedBlob, `Qwerty-Learner-User-Data-${currentDate}.gz`)
  recordDataAction({ type: 'export', size: compressedBlob.size, wordCount, chapterCount })
}

export async function importDatabaseBlob(blob: Blob, callback?: (importProgress: ImportProgress) => boolean) {
  const [pako] = await Promise.all([import('pako'), import('dexie-export-import')])

  const compressed = await blob.arrayBuffer()
  const json = pako.ungzip(compressed, { to: 'string' })
  const jsonBlob = new Blob([json])

  await db.import(jsonBlob, {
    acceptVersionDiff: true,
    acceptMissingTables: true,
    acceptNameDiff: false,
    acceptChangedPrimaryKey: false,
    overwriteValues: true,
    clearTablesBeforeImport: true,
    progressCallback: (progress) => {
      return callback ? callback(progress) : true
    },
  })
}

export async function importDatabase(onStart: () => void, callback: (importProgress: ImportProgress) => boolean) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/gzip'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    onStart()
    await importDatabaseBlob(file, callback)

    const [wordCount, chapterCount] = await Promise.all([db.wordRecords.count(), db.chapterRecords.count()])
    recordDataAction({ type: 'import', size: file.size, wordCount, chapterCount })
  })

  input.click()
}
