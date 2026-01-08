import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ChartBar from '~icons/heroicons/chart-bar-solid'

const StatisticsButton = () => {
  const navigate = useNavigate()

  const toStatistics = useCallback(() => {
    navigate('/statistics')
  }, [navigate])

  return (
    <button
      type="button"
      onClick={toStatistics}
      className={`flex items-center justify-center rounded p-[2px] text-lg text-indigo-500 outline-none transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white`}
      title="新版数据统计"
    >
      <ChartBar className="icon" />
    </button>
  )
}

export default StatisticsButton
