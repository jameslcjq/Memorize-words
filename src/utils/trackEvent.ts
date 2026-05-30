import { track } from '@vercel/analytics'

type GtagWindow = Window &
  typeof globalThis & {
    gtag?: (command: 'event', eventName: string, params?: Record<string, string>) => void
  }

export const trackPromotionEvent = (event: string, properties: Record<string, string>) => {
  track(event, properties)

  const browserWindow = typeof window === 'undefined' ? undefined : (window as GtagWindow)
  if (browserWindow?.gtag) {
    try {
      browserWindow.gtag('event', event, { ...properties })
      if (properties.action_detail) {
        browserWindow.gtag('event', properties.action_detail)
      }
    } catch (error) {
      console.error(error)
    }
  }
}
