export function formatEventDate(dateInput?: string | Date | null) {
  if (!dateInput) return { date: '', time: '' }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }

  // Format in Eastern Time
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  }).format(d)

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  }).format(d) + ' (ET)'

  return { date: dateStr, time: timeStr }
}

export default formatEventDate
