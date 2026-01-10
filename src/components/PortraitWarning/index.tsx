import logo from '@/assets/logo.svg'
import { RotateCw } from 'lucide-react'
import type React from 'react'

/**
 * Portrait mode warning component
 * Shown when device is in portrait orientation on small screens
 */
const PortraitWarning: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Logo */}
      <img src={logo} alt="老九背单词" className="mb-8 h-20 w-20" />

      {/* Rotate Icon Animation */}
      <div className="mb-6 animate-pulse">
        <RotateCw className="h-16 w-16 text-indigo-500" />
      </div>

      {/* Title */}
      <h1 className="mb-4 text-center text-2xl font-bold text-gray-800 dark:text-white">请横屏使用</h1>

      {/* Description */}
      <p className="mb-8 max-w-xs text-center text-gray-600 dark:text-gray-400">为了更好的学习体验，请将您的设备旋转至横屏模式</p>

      {/* Visual Hint */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-8 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
          <div className="h-6 w-4 rounded bg-indigo-400"></div>
        </div>
        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div className="flex h-8 w-14 items-center justify-center rounded-lg border-2 border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30">
          <div className="h-4 w-8 rounded bg-indigo-400"></div>
        </div>
      </div>

      {/* Tip */}
      <p className="mt-8 text-center text-sm text-gray-400">💡 提示：横屏模式下可以使用键盘进行打字练习</p>
    </div>
  )
}

export default PortraitWarning
