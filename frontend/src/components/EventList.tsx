import React from 'react'
import EventCard from './EventCard'

type Props = {
  events: any[];
}

const EventList: React.FC<Props> = ({ events }) => {
  if (!events || events.length === 0) return <p>No events available.</p>

  return (
    <div className="event-grid">
      {events.map(evt => (
        <EventCard key={evt.id} evt={evt} />
      ))}
    </div>
  )
}

export default EventList
