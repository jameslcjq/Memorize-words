import { userInfoAtom } from '@/store'
import * as Dialog from '@radix-ui/react-dialog'
import { useAtom } from 'jotai'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LoginModal = () => {
  const [userInfo, setUserInfo] = useAtom(userInfoAtom)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // Form State
  const [mode, setMode] = useState<'register' | 'login'>('login')
  const [nickname, setNickname] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleAuth = async () => {
    if (!username || !password) {
      alert('请输入账号和密码')
      return
    }
    if (mode === 'register' && !nickname) {
      alert('注册时请输入昵称')
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        type: mode,
        username,
        password,
        nickname: mode === 'register' ? nickname : undefined,
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Request failed')

      if (data.success) {
        // Map backend user format to frontend userInfo format
        setUserInfo({
          userId: data.user.id,
          username: data.user.username,
          nickname: data.user.nickname,
        })
        setIsOpen(false)
        // Reset form
        setUsername('')
        setPassword('')
        setNickname('')
      }
    } catch (e: any) {
      alert('操作失败: ' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  // If logged in, clicking should navigate to profile
  const handleClick = () => {
    if (userInfo) {
      navigate('/profile')
    } else {
      setIsOpen(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
      >
        {userInfo ? '个人中心' : '登录 / 同步'}
      </button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[200] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
              {mode === 'register' ? '创建新账号' : '账号登录'}
            </Dialog.Title>

            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                handleAuth()
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                autoFocus
                placeholder="账号 / 用户名"
                className="rounded-md border bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="密码"
                className="rounded-md border bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'register' && (
                <input
                  type="text"
                  placeholder="昵称 (展示用)"
                  className="rounded-md border bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? '处理中...' : mode === 'register' ? '注册并登录' : '登录'}
              </button>

              <div className="mt-2 flex justify-center text-sm">
                <button
                  type="button"
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                  onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
                >
                  {mode === 'register' ? '已有账号？去登录' : '没有账号？去注册'}
                </button>
              </div>
            </form>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setIsOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                取消
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export default LoginModal
