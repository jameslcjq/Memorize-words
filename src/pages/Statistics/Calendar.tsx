import './Calendar.css'
import type React from 'react'
import { useMemo, useState } from 'react'

interface CalendarProps {
  // A Set of date strings 'YYYY-MM-DD' that have practice records
  checkedDates: Set<string>
  selectedDate: string
  onSelectDate: (date: string) => void
}

const Calendar: React.FC<CalendarProps> = ({ checkedDates, selectedDate, onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Helpers
  const getDateKey = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
  }

  // Data processing for render
  const daysData = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const days = []

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push({ type: 'empty', key: `empty-${i}` })
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = getDateKey(year, month, day)
      const isChecked = checkedDates.has(dateKey)
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
      const isSelected = dateKey === selectedDate

      days.push({
        type: 'day',
        day,
        dateKey,
        isChecked,
        isToday,
        isSelected,
        key: dateKey,
      })
    }

    return days
  }, [year, month, checkedDates, selectedDate])

  const streakCount = useMemo(() => {
    let count = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      if (checkedDates.has(getDateKey(year, month, i))) {
        count++
      }
    }
    return count
  }, [year, month, checkedDates])

  return (
    <div className="minimal-calendar-wrapper flex justify-center">
      <div className="calendar-card">
        <header>
          <button className="nav-btn" onClick={() => changeMonth(-1)}>
            ❮
          </button>
          <h2>
            <span>
              {year}年 {month + 1}月
            </span>
            <span className="sub-text">本月已坚持 {streakCount} 天</span>
          </h2>
          <button className="nav-btn" onClick={() => changeMonth(1)}>
            ❯
          </button>
        </header>

        <div className="grid-header">
          <div>日</div>
          <div>一</div>
          <div>二</div>
          <div>三</div>
          <div>四</div>
          <div>五</div>
          <div>六</div>
        </div>

        <div className="days-container">
          {daysData.map((item) => {
            if (item.type === 'empty') {
              return <div key={item.key} />
            }
            return (
              <div
                key={item.key}
                className={`day ${item.isChecked ? 'checked' : ''} ${item.isToday ? 'today' : ''} ${item.isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDate(item.dateKey!)}
              >
                {item.day}
              </div>
            )
          })}
        </div>

        <div className="footer-tip">数据为本地实时统计</div>
      </div>
    </div>
  )
}

export default Calendar
