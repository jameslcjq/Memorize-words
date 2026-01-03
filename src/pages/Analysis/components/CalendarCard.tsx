import styles from './CalendarCard.module.css'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'

interface CalendarCardProps {
  practicedDates: string[] // List of dates 'YYYY-MM-DD'
  onDateSelect: (date: string) => void
  selectedDate: string | null
}

const CalendarCard: React.FC<CalendarCardProps> = ({ practicedDates, onDateSelect, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [markedDates, setMarkedDates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Convert array to map for O(1) lookup
    const map: Record<string, boolean> = {}
    practicedDates.forEach((date) => {
      map[date] = true
    })
    setMarkedDates(map)
  }, [practicedDates])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1))
  }

  // Calculate current streak for the displayed month (optional feature based on user code)
  // User's code: "本月已坚持 X 天" -> Count marked days in THIS month
  const getMonthStats = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let count = 0
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = dayjs(new Date(year, month, i)).format('YYYY-MM-DD')
      if (markedDates[dateKey]) {
        count++
      }
    }
    return count
  }

  const renderDays = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
    const todayStr = dayjs().format('YYYY-MM-DD')

    const days = []

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.day + ' ' + styles.empty}></div>)
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day)
      const dateKey = dayjs(dateObj).format('YYYY-MM-DD')
      const isChecked = !!markedDates[dateKey]
      const isToday = dateKey === todayStr
      const isSelected = selectedDate === dateKey

      let className = styles.day
      if (isChecked) className += ` ${styles.checked}`
      if (isToday) className += ` ${styles.today}`
      if (isSelected) className += ` ${styles.selected}`

      days.push(
        <div key={dateKey} className={className} onClick={() => onDateSelect(dateKey)}>
          {day}
        </div>,
      )
    }
    return days
  }

  return (
    <div className={styles.calendarCard}>
      <header className={styles.header}>
        <button className={styles.navBtn} onClick={() => changeMonth(-1)}>
          ❮
        </button>
        <h2>
          <span>
            {year}年 {month + 1}月
          </span>
          <span className={styles.subText}>本月已坚持 {getMonthStats()} 天</span>
        </h2>
        <button className={styles.navBtn} onClick={() => changeMonth(1)}>
          ❯
        </button>
      </header>

      <div className={styles.gridHeader}>
        <div>日</div>
        <div>一</div>
        <div>二</div>
        <div>三</div>
        <div>四</div>
        <div>五</div>
        <div>六</div>
      </div>

      <div className={styles.daysContainer}>{renderDays()}</div>
    </div>
  )
}

export default CalendarCard
