import React from 'react'

export type Filters = {
  hasTicketsLeft: boolean;
  maxPrice: string;       // '' | '0' | '1000' | '2500' | '5000' | 'any'
  reservedSeating: boolean;
  dateFrom: string;       // ISO date string YYYY-MM-DD or ''
  dateTo: string;
}

export const DEFAULT_FILTERS: Filters = {
  hasTicketsLeft: false,
  maxPrice: '',
  reservedSeating: false,
  dateFrom: '',
  dateTo: '',
}

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '0', label: 'Free only' },
  { value: '1000', label: 'Up to $10.00' },
  { value: '2500', label: 'Up to $25.00' },
  { value: '5000', label: 'Up to $50.00' },
]

const SidebarFilters: React.FC<Props> = ({ filters, onChange }) => {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })

  const isDirty =
    filters.hasTicketsLeft ||
    filters.maxPrice !== '' ||
    filters.reservedSeating ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''

  return (
    <aside className="sidebar" aria-label="Filters">
      <div className="sidebar-filter-header">
        <h4>Filters</h4>
        {isDirty && (
          <button
            className="sidebar-clear-btn"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Availability */}
      <div className="sidebar-filter-section">
        <div className="sidebar-filter-label">Availability</div>
        <label className="sidebar-checkbox-row">
          <input
            type="checkbox"
            checked={filters.hasTicketsLeft}
            onChange={e => set('hasTicketsLeft', e.target.checked)}
          />
          Has tickets left
        </label>
        <label className="sidebar-checkbox-row">
          <input
            type="checkbox"
            checked={filters.reservedSeating}
            onChange={e => set('reservedSeating', e.target.checked)}
          />
          Reserved seating
        </label>
      </div>

      {/* Price */}
      <div className="sidebar-filter-section">
        <div className="sidebar-filter-label">Starting price</div>
        <div className="sidebar-radio-group">
          {PRICE_OPTIONS.map(opt => (
            <label key={opt.value} className="sidebar-radio-row">
              <input
                type="radio"
                name="maxPrice"
                value={opt.value}
                checked={filters.maxPrice === opt.value}
                onChange={() => set('maxPrice', opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="sidebar-filter-section">
        <div className="sidebar-filter-label">Date range</div>
        <div className="sidebar-date-row">
          <label className="sidebar-date-label">From</label>
          <input
            type="date"
            className="sidebar-date-input"
            value={filters.dateFrom}
            onChange={e => set('dateFrom', e.target.value)}
          />
        </div>
        <div className="sidebar-date-row">
          <label className="sidebar-date-label">To</label>
          <input
            type="date"
            className="sidebar-date-input"
            value={filters.dateTo}
            onChange={e => set('dateTo', e.target.value)}
          />
        </div>
      </div>
    </aside>
  )
}

export default SidebarFilters
