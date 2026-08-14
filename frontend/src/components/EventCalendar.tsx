import React from 'react'
import { useNavigate } from 'react-router-dom'

type Props = {
  events: any[];
  currentMonth: Date;
  onMonthChange?: (d: Date) => void;
}

function getEvtDay(evt: any): { day: number; month: number; year: number } | null {
  const raw = evt.date
  if (!raw) return null
  const d = typeof raw === 'string' ? new Date(raw) : raw
  if (Number.isNaN(d.getTime())) return null
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() }
}

const EventCalendar: React.FC<Props> = ({ events, currentMonth, onMonthChange }) => {
  const navigate = useNavigate()
  const y = currentMonth.getFullYear()
  const m = currentMonth.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const firstDay = first.getDay()
  const daysInMonth = last.getDate()
  const startOffset = firstDay
  const totalCells = 35
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const eventsByDay: Record<number, any[]> = {}
  for (let i = 1; i <= 31; i++) eventsByDay[i] = []
  events.forEach(evt => {
    const info = getEvtDay(evt)
    if (!info || info.month !== m || info.year !== y) return
    if (!eventsByDay[info.day]) eventsByDay[info.day] = []
    eventsByDay[info.day].push(evt)
  })

  const cells: { dayNum: number | null; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < totalCells; i++) {
    if (i < startOffset) {
      cells.push({ dayNum: null, isCurrentMonth: false })
    } else {
      const dayNum = i - startOffset + 1
      cells.push({ dayNum: dayNum <= daysInMonth ? dayNum : null, isCurrentMonth: dayNum <= daysInMonth })
    }
  }

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="event-calendar">
      <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{monthLabel}</span>
        {onMonthChange && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              const next = new Date(y, m + 1, 1)
              onMonthChange(next)
            }}
          >
            Next
          </button>
        )}
      </div>
      <div className="calendar-grid">
        {dayLabels.map((label, idx) => (
          <div key={idx} className="calendar-weekday" style={{ fontSize: '0.7rem', color: '#666' }}>
            {label}
          </div>
        ))}
        {cells.map((cell, idx) => (
          <div key={idx} className={`calendar-day ${cell.isCurrentMonth ? 'in-month' : 'out-month'}`}>
            {cell.dayNum != null && <span className="calendar-day-num">{cell.dayNum}</span>}
            {cell.dayNum != null && eventsByDay[cell.dayNum]?.length > 0 && (
              <div className="calendar-day-events">
                {eventsByDay[cell.dayNum].map((evt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="calendar-event"
                    onClick={() => navigate(`/event/${evt.id}`)}
                  >
                    {evt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default EventCalendar
