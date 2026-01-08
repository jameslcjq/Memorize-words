import Loading from '@/components/Loading'
import AdvancedSetting from '@/pages/Typing/components/Setting/AdvancedSetting'
import DataSetting from '@/pages/Typing/components/Setting/DataSetting'
import SoundSetting from '@/pages/Typing/components/Setting/SoundSetting'
import ViewSetting from '@/pages/Typing/components/Setting/ViewSetting'
import { userInfoAtom } from '@/store'
import { Tab } from '@headlessui/react'
import classNames from 'classnames'
import { useAtom } from 'jotai'
import { ArrowLeft, BarChart2, LogOut, Settings, User } from 'lucide-react'
import type React from 'react'
import { Suspense, lazy, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Statistics = lazy(() => import('@/pages/Statistics'))

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useAtom(userInfoAtom)
  const [activeTab, setActiveTab] = useState<'profile' | 'statistics' | 'settings'>('profile')

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？退出后将无法自动同步数据。')) {
      setUserInfo(null)
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title="返回首页"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">个人中心</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <div className="w-full lg:w-64">
            <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
              {/* User Info */}
              <div className="mb-6 flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-bold text-white">
                  {userInfo?.nickname?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">{userInfo?.nickname || '未登录'}</div>
                {userInfo && <div className="mt-1 text-sm text-green-600 dark:text-green-400">✓ 云端同步已开启</div>}
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>账号信息</span>
                </button>
                <button
                  onClick={() => setActiveTab('statistics')}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeTab === 'statistics'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <BarChart2 className="h-5 w-5" />
                  <span>数据统计</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span>设置</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-gray-100">账号信息</h2>
                {userInfo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <span className="text-gray-500 dark:text-gray-400">昵称</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{userInfo.nickname}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <span className="text-gray-500 dark:text-gray-400">账号</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{userInfo.username || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <span className="text-gray-500 dark:text-gray-400">云端同步</span>
                      <span className="font-medium text-green-600 dark:text-green-400">已开启</span>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p>您尚未登录</p>
                    <p className="mt-2 text-sm">登录后可以同步您的学习数据到云端</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'statistics' && (
              <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
                <Suspense fallback={<Loading />}>
                  <Statistics />
                </Suspense>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-gray-100">设置</h2>
                <Tab.Group>
                  <Tab.List className="mb-6 flex space-x-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    <Tab
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors',
                          selected
                            ? 'bg-white text-indigo-600 shadow dark:bg-gray-600 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-white/50 dark:text-gray-300',
                        )
                      }
                    >
                      音效设置
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors',
                          selected
                            ? 'bg-white text-indigo-600 shadow dark:bg-gray-600 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-white/50 dark:text-gray-300',
                        )
                      }
                    >
                      高级设置
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors',
                          selected
                            ? 'bg-white text-indigo-600 shadow dark:bg-gray-600 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-white/50 dark:text-gray-300',
                        )
                      }
                    >
                      显示设置
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors',
                          selected
                            ? 'bg-white text-indigo-600 shadow dark:bg-gray-600 dark:text-indigo-400'
                            : 'text-gray-600 hover:bg-white/50 dark:text-gray-300',
                        )
                      }
                    >
                      数据设置
                    </Tab>
                  </Tab.List>
                  <Tab.Panels>
                    <Tab.Panel>
                      <SoundSetting />
                    </Tab.Panel>
                    <Tab.Panel>
                      <AdvancedSetting />
                    </Tab.Panel>
                    <Tab.Panel>
                      <ViewSetting />
                    </Tab.Panel>
                    <Tab.Panel>
                      <DataSetting />
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
