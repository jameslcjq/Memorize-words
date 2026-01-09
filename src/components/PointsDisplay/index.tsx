// Points Display Component for Header
import { useGamification } from '@/hooks/useGamification'
import IconCoin from '~icons/tabler/coin'

export default function PointsDisplay() {
  const { totalPoints } = useGamification()

  return (
    <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-sm font-bold text-white shadow-md">
      <IconCoin className="h-4 w-4" />
      <span>{totalPoints.toLocaleString()}</span>
    </div>
  )
}
