import Loading from './components/Loading'
import PortraitWarning from './components/PortraitWarning'
import { useAutoSync } from './hooks/useAutoSync'
import './index.css'
import { ErrorBook } from './pages/ErrorBook'
import { FriendLinks } from './pages/FriendLinks'
import TypingPage from './pages/Typing'
import { isOpenDarkModeAtom } from '@/store'
import { Analytics } from '@vercel/analytics/react'
import 'animate.css'
import { useAtomValue } from 'jotai'
import mixpanel from 'mixpanel-browser'
import process from 'process'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import 'react-app-polyfill/stable'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const StatisticsPage = lazy(() => import('./pages/Statistics'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))
const AdminPage = lazy(() => import('./pages/Admin'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const AchievementsPage = lazy(() => import('./pages/Achievements'))
const DailyChallengePage = lazy(() => import('./pages/DailyChallenge'))

if (process.env.NODE_ENV === 'production') {
  // for prod
  mixpanel.init('bdc492847e9340eeebd53cc35f321691')
} else {
  // for dev
  mixpanel.init('5474177127e4767124c123b2d7846e2a', { debug: true })
}

// Check if device is in portrait mode on small screen (iPhone竖屏)
const isPortraitOnSmallScreen = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  // Portrait mode: height > width AND screen is small (< 768px width when in landscape)
  return height > width && Math.max(width, height) < 750
}

function Root() {
  const darkMode = useAtomValue(isOpenDarkModeAtom)

  // Enable automatic cloud sync every 3 minutes for logged-in users
  useAutoSync()

  useEffect(() => {
    darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [darkMode])

  const [isPortrait, setIsPortrait] = useState(isPortraitOnSmallScreen())

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(isPortraitOnSmallScreen())
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Show portrait warning for small screens in portrait mode
  if (isPortrait) {
    return <PortraitWarning />
  }

  return (
    <React.StrictMode>
      <BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/Memorize-words' : ''}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<TypingPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/error-book" element={<ErrorBook />} />
            <Route path="/friend-links" element={<FriendLinks />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/daily-challenge" element={<DailyChallengePage />} />
            <Route path="/*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Analytics />
    </React.StrictMode>
  )
}

const container = document.getElementById('root')

container && createRoot(container).render(<Root />)
