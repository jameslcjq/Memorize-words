import logo from '@/assets/logo.svg'
import PointsDisplay from '@/components/PointsDisplay'
import Tooltip from '@/components/Tooltip'
import type { PropsWithChildren } from 'react'
import type React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import IconFlame from '~icons/tabler/flame'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate()

  return (
    <header className="container relative z-[100] mx-auto w-full px-10 py-3 lg:py-6">
      <div className="flex w-full flex-col items-center justify-between space-y-3 lg:flex-row lg:space-y-0">
        <NavLink className="flex items-center text-2xl font-bold text-indigo-500 no-underline hover:no-underline lg:text-4xl" to="/">
          <img src={logo} className="mr-3 h-16 w-16" alt="老九背单词 Logo" />
          <h1>老九背单词</h1>
        </NavLink>
        <nav className="my-card ml-auto flex w-auto content-center items-center justify-end space-x-3 rounded-xl bg-white p-4 transition-colors duration-300 dark:bg-gray-800">
          {/* Points Display */}
          <PointsDisplay />

          {/* Daily Challenge */}
          <Tooltip content="每日挑战">
            <button
              onClick={() => navigate('/daily-challenge')}
              className="flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-orange-500 transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <IconFlame className="h-5 w-5" />
            </button>
          </Tooltip>

          {children}
        </nav>
      </div>
    </header>
  )
}

export default Header
