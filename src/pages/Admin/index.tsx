import { api, buildAuthHeaders, clearAuthToken, getAuthToken, setAuthToken } from '@/lib/api'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

const ADMIN_TOKEN_STORAGE_KEY = 'admin_token'

type AdminStats = {
  totalUsers: number
  totalRecords: number
  activeUsersToday: number
}

type AdminUser = {
  id: string
  username: string
  nickname: string
  createdAt: number
}

type AdminResponse<T> = {
  success?: boolean
  error?: string
  data: T
}

const Admin = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const getAdminToken = useCallback(() => getAuthToken(sessionStorage, ADMIN_TOKEN_STORAGE_KEY), [])

  const adminRequest = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const token = getAdminToken()
      if (!token) {
        throw new Error('管理员会话已失效，请重新登录')
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: buildAuthHeaders(options.headers, token),
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAuthToken(sessionStorage, ADMIN_TOKEN_STORAGE_KEY)
          setIsAuthorized(false)
        }

        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      return data as T
    },
    [getAdminToken],
  )

  const loadAdminData = useCallback(async () => {
    const [statsRes, usersRes] = await Promise.all([
      adminRequest<AdminResponse<AdminStats>>('/api/admin/stats'),
      adminRequest<AdminResponse<AdminUser[]>>('/api/admin/users'),
    ])

    setStats(statsRes.data)
    setUsers(usersRes.data)
    setIsAuthorized(true)
  }, [adminRequest])

  const getAuthErrorMessage = useCallback((message: string) => {
    if (message === 'Forbidden') return '当前账号没有管理员权限'
    if (message === 'Admin access is not configured') return '管理员白名单未配置'
    if (message === 'Invalid credentials') return '账号或密码错误'
    if (message === 'Server auth is not configured') return '服务端 JWT_SECRET 未配置'
    return message || '连接错误'
  }, [])

  const checkAuth = useCallback(
    async (loginUsername: string, loginPassword: string) => {
      setLoading(true)
      setAuthError('')
      try {
        const res = await api.auth.login(loginUsername, loginPassword)
        if (!res.success || !res.token) {
          throw new Error(res.error || '登录失败')
        }

        setAuthToken(res.token, sessionStorage, ADMIN_TOKEN_STORAGE_KEY)
        await loadAdminData()
        setPassword('')
      } catch (error: any) {
        clearAuthToken(sessionStorage, ADMIN_TOKEN_STORAGE_KEY)
        setIsAuthorized(false)
        setStats(null)
        setUsers([])
        setAuthError(getAuthErrorMessage(error.message))
      } finally {
        setLoading(false)
      }
    },
    [getAuthErrorMessage, loadAdminData],
  )

  useEffect(() => {
    if (!getAdminToken()) return

    setLoading(true)
    loadAdminData()
      .catch((error: any) => {
        clearAuthToken(sessionStorage, ADMIN_TOKEN_STORAGE_KEY)
        setIsAuthorized(false)
        setAuthError(getAuthErrorMessage(error.message))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [getAdminToken, getAuthErrorMessage, loadAdminData])

  const handleResetPoints = async (userId: string, username: string) => {
    if (!confirm(`确认清零「${username}」的所有积分？此操作不可撤销。`)) return

    try {
      const data = await adminRequest<AdminResponse<{ deleted: number }>>('/api/admin/reset_points', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      })

      alert(`积分已清零（删除了 ${data.data.deleted} 条记录）`)
    } catch (e: any) {
      alert('操作失败: ' + getAuthErrorMessage(e.message))
    }
  }

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('请输入新密码：')
    if (!newPassword) return

    try {
      await adminRequest<AdminResponse<null>>('/api/admin/reset_password', {
        method: 'POST',
        body: JSON.stringify({ userId, newPassword }),
      })

      alert('密码重置成功')
    } catch (e: any) {
      alert('操作失败: ' + getAuthErrorMessage(e.message))
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setAuthError('请输入管理员账号和密码')
      return
    }

    checkAuth(username, password)
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleLogin} className="w-80 space-y-4 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          <h2 className="text-center text-xl font-bold dark:text-white">管理员登录</h2>
          <input
            type="text"
            className="w-full rounded border p-2 dark:bg-gray-700 dark:text-white"
            placeholder="请输入管理员账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded border p-2 dark:bg-gray-700 dark:text-white"
            placeholder="请输入账号密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {authError && <p className="text-sm text-red-500">{authError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '验证中...' : '登录'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold dark:text-white">后台管理面板</h1>
          <button
            onClick={() => {
              clearAuthToken(sessionStorage, ADMIN_TOKEN_STORAGE_KEY)
              setIsAuthorized(false)
              setStats(null)
              setUsers([])
              setPassword('')
              setAuthError('')
            }}
            className="text-red-500 hover:underline"
          >
            退出登录
          </button>
        </header>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">用户总数</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{stats?.totalUsers || 0}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">总打卡次数</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats?.totalRecords || 0}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">今日活跃用户</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats?.activeUsersToday || 0}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-800">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold dark:text-white">最新注册用户</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">昵称</th>
                  <th className="px-6 py-3">账号</th>
                  <th className="px-6 py-3">注册时间</th>
                  <th className="px-6 py-3">用户ID</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-medium">{u.nickname}</td>
                    <td className="px-6 py-4">{u.username}</td>
                    <td className="px-6 py-4">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{u.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          重置密码
                        </button>
                        <button
                          onClick={() => handleResetPoints(u.id, u.username)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          清零积分
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
