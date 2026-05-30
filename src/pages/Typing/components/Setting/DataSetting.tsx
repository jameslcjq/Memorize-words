import styles from './index.module.css'
import { useCloudSync } from '@/hooks/useCloudSync'
import { api, clearAuthToken, setAuthToken } from '@/lib/api'
import { userInfoAtom } from '@/store'
import { exportDatabase, importDatabase } from '@/utils/db/data-export'
import * as Progress from '@radix-ui/react-progress'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom } from 'jotai'
import { useState } from 'react'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误'
}

export default function DataSetting() {
  const [userInfo, setUserInfo] = useAtom(userInfoAtom)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const { uploadOnly, downloadOnly, isSyncing } = useCloudSync()

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
        const registerRes = await api.auth.register(username, password)
        if (!registerRes.success) {
          throw new Error(registerRes.error || '注册失败')
        }
        res = await api.auth.login(username, password)
      }

      if (res.success && res.token && res.user) {
        setAuthToken(res.token)
        setUserInfo({ userId: res.user.id, username: res.user.username, nickname: res.user.nickname || '' })
        setSyncStatus(`欢迎, ${res.user.username}，正在同步云端数据...`)
        // Auto-sync cloud data after login
        setTimeout(async () => {
          await downloadOnly()
          setSyncStatus('云端数据已同步')
        }, 100)
      }
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuthToken()
    setUserInfo(null)
    setSyncStatus('')
  }

  const handleUpload = async () => {
    if (!userInfo) return
    if (!confirm('确定要将本地学习数据同步到云端吗？')) return
    setLoading(true)
    setSyncStatus('正在上传本地数据...')
    try {
      const success = await uploadOnly()
      if (!success) throw new Error('上传失败，请检查网络或登录状态')
      setSyncStatus('上传成功！')
      alert('上传成功！')
    } catch (err) {
      alert('上传失败: ' + getErrorMessage(err))
      setSyncStatus('上传失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!confirm('确定要从云端同步最新数据吗？')) return
    setLoading(true)
    setSyncStatus('正在下载...')
    try {
      const success = await downloadOnly()
      if (!success) throw new Error('下载失败，请检查网络或登录状态')
      setSyncStatus('同步完成！')
      alert('同步完成！部分设置会在刷新页面后生效。')
    } catch (e) {
      alert('下载失败: ' + getErrorMessage(e))
      setSyncStatus('下载失败')
    } finally {
      setLoading(false)
      setImportProgress(0)
    }
  }

  const handleLocalExport = () => {
    exportDatabase(({ totalRows, completedRows }) => {
      setExportProgress(totalRows ? (completedRows / totalRows) * 100 : 0)
      return true
    }).finally(() => setExportProgress(0))
  }

  const handleLocalImport = () => {
    importDatabase(
      () => setImportProgress(1),
      ({ totalRows, completedRows, done }) => {
        setImportProgress(totalRows ? (completedRows / totalRows) * 100 : 0)
        if (done) {
          setTimeout(() => setImportProgress(0), 500)
        }
        return true
      },
    )
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
                    <button onClick={handleUpload} disabled={loading || isSyncing} className="my-btn-primary px-3 py-1 text-xs">
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
                    <button onClick={handleDownload} disabled={loading || isSyncing} className="my-btn-primary px-3 py-1 text-xs">
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
            <span className={styles.sectionDescription}>手动导出/导入 .gz 文件。</span>
            <div className="flex gap-3 px-4 py-2">
              <button onClick={handleLocalExport} disabled={loading} className="my-btn-primary px-3 py-1 text-xs">
                导出
              </button>
              <button onClick={handleLocalImport} disabled={loading} className="my-btn-primary px-3 py-1 text-xs">
                导入
              </button>
            </div>
            {exportProgress > 0 && (
              <Progress.Root className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-gray-200" value={exportProgress}>
                <Progress.Indicator
                  className="h-full w-full bg-indigo-500 transition-transform"
                  style={{ transform: `translateX(-${100 - exportProgress}%)` }}
                />
              </Progress.Root>
            )}
            {importProgress > 0 && (
              <Progress.Root className="mx-4 h-1 overflow-hidden rounded-full bg-gray-200" value={importProgress}>
                <Progress.Indicator
                  className="h-full w-full bg-indigo-500 transition-transform"
                  style={{ transform: `translateX(-${100 - importProgress}%)` }}
                />
              </Progress.Root>
            )}
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
