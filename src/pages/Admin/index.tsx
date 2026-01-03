import Layout from '@/components/Layout'
import type React from 'react'
import { useEffect, useState } from 'react'

const Admin = () => {
  const [password, setPassword] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const checkAuth = async (pwd: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': pwd },
      })
      if (res.ok) {
        setIsAuthorized(true)
        const data = await res.json()
        setStats(data.data)
        // Fetch users too
        const usersRes = await fetch('/api/admin/users', {
          headers: { 'x-admin-password': pwd },
        })
        const usersData = await usersRes.json()
        setUsers(usersData.data)
        // Save to session
        sessionStorage.setItem('admin_pwd', pwd)
      } else {
        alert('密码错误')
      }
    } catch (e) {
      alert('连接错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pwd')
    if (saved) {
      setPassword(saved)
      checkAuth(saved)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    checkAuth(password)
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleLogin} className="w-80 space-y-4 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          <h2 className="text-center text-xl font-bold dark:text-white">管理员登录</h2>
          <input
            type="password"
            className="w-full rounded border p-2 dark:bg-gray-700 dark:text-white"
            placeholder="请输入管理员密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
              sessionStorage.removeItem('admin_pwd')
              window.location.reload()
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-medium">{u.nickname}</td>
                    <td className="px-6 py-4">{u.username}</td>
                    <td className="px-6 py-4">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{u.id}</td>
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
