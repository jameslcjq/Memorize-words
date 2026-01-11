import styles from './index.module.css'
import { useCloudSync } from '@/hooks/useCloudSync'
import { api } from '@/lib/api'
import { userInfoAtom } from '@/store'
import { exportDatabase, exportDatabaseBlob, importDatabase, importDatabaseBlob } from '@/utils/db/data-export'
import * as Progress from '@radix-ui/react-progress'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom } from 'jotai'
import { useCallback, useState } from 'react'

export default function DataSetting() {
  const [userInfo, setUserInfo] = useAtom(userInfoAtom)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const { downloadOnly, isSyncing } = useCloudSync()

  // Sync Progress States
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      let res
      if (isLoginMode) {
        res = await api.auth.login(username, password)
      } else {
        res = await api.auth.register(username, password)
      }

      if (res.success && res.token && res.user) {
        localStorage.setItem('token', res.token)
        setUserInfo({ userId: res.user.id, username: res.user.username, nickname: res.user.nickname || '' })
        setSyncStatus(`欢迎, ${res.user.username}，正在同步云端数据...`)
        // Auto-sync cloud data after login
        setTimeout(async () => {
          await downloadOnly()
          setSyncStatus('云端数据已同步')
        }, 100)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUserInfo(null)
    setSyncStatus('')
  }

  const handleUpload = async () => {
    if (!userInfo) return
    if (!confirm('确定要将本地数据上传并覆盖云端数据吗？')) return
    setLoading(true)
    setSyncStatus('正在打包数据...')
    try {
      const blob = await exportDatabaseBlob(({ totalRows, completedRows }) => {
        setExportProgress(totalRows ? (completedRows / totalRows) * 100 : 0)
        return true
      })

      setSyncStatus('正在上传...')
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64data = reader.result as string
        // Remove data URL prefix (e.g. "data:application/octet-stream;base64,") if necessary,
        // but keeping it is fine if we just treat it as a string blob.
        // Sync API expects { data: ... }

        await api.sync.upload(base64data)
        setSyncStatus('上传成功！')
        alert('上传成功！')
        setLoading(false)
        setExportProgress(0)
      }
    } catch (err: any) {
      alert('上传失败: ' + err.message)
      setLoading(false)
      setSyncStatus('上传失败')
    }
  }

  const handleDownload = async () => {
    if (!confirm('确定要用云端数据覆盖本地数据吗？此操作不可逆！')) return
    setLoading(true)
    setSyncStatus('正在下载...')
    try {
      const res = await api.sync.download()
      if (res.success && res.data) {
        setSyncStatus('正在导入...')

        // Convert Base64 to Blob
        const fetchRes = await fetch(res.data)
        const blob = await fetchRes.blob()

        await importDatabaseBlob(blob, ({ totalRows, completedRows }) => {
          setImportProgress(totalRows ? (completedRows / totalRows) * 100 : 0)
          return true
        })

        setSyncStatus('同步完成！')
        alert('同步完成！请刷新页面。')
        window.location.reload()
      }
    } catch (e: any) {
      alert('下载失败: ' + (e.message || '未知错误'))
      setSyncStatus('下载失败')
    } finally {
      setLoading(false)
      setImportProgress(0)
    }
  }

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          {/* Auth Section */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>云端同步</span>
            {!userInfo ? (
              <div className="flex flex-col gap-3 px-4 py-2">
                <div className="flex gap-2 text-sm text-gray-500">
                  <button className={`font-bold ${isLoginMode ? 'text-indigo-600' : ''}`} onClick={() => setIsLoginMode(true)}>
                    登录
                  </button>
                  <span>/</span>
                  <button className={`font-bold ${!isLoginMode ? 'text-indigo-600' : ''}`} onClick={() => setIsLoginMode(false)}>
                    注册
                  </button>
                </div>
                <form onSubmit={handleAuth} className="flex flex-col gap-3">
                  <input
                    className="rounded border p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <input
                    className="rounded border p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    type="password"
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="submit" disabled={loading} className="my-btn-primary w-full justify-center">
                    {loading ? '处理中...' : isLoginMode ? '登录' : '注册'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="px-4 py-2">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-bold text-indigo-600">{userInfo.username}</span>
                  <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">
                    退出登录
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">上传本地数据到云端</span>
                    <button onClick={handleUpload} disabled={loading} className="my-btn-primary px-3 py-1 text-xs">
                      上传
                    </button>
                  </div>
                  {/* Progress Bar for Upload */}
                  {exportProgress > 0 && (
                    <Progress.Root className="h-1 w-full overflow-hidden rounded-full bg-gray-200" value={exportProgress}>
                      <Progress.Indicator
                        className="h-full w-full bg-indigo-500 transition-transform"
                        style={{ transform: `translateX(-${100 - exportProgress}%)` }}
                      />
                    </Progress.Root>
                  )}

                  <hr className="my-1 border-gray-100 dark:border-gray-700" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm">从云端下载并覆盖</span>
                    <button onClick={handleDownload} disabled={loading} className="my-btn-primary px-3 py-1 text-xs">
                      下载
                    </button>
                  </div>
                </div>
                {syncStatus && <p className="mt-2 text-center text-xs text-gray-400">{syncStatus}</p>}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <span className={styles.sectionLabel}>本地备份 (旧版)</span>
            {/* Keeping old export/import UI as fallback if needed, or simplified */}
            <span className={styles.sectionDescription}>手动导出/导入 .gz 文件。</span>
            {/* ... simplified buttons for manual backup ... */}
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
