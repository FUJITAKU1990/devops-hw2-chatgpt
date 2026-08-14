import React from 'react'

interface AdminPaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}

const AdminPagination: React.FC<AdminPaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const safeTotalPages = Math.max(1, totalPages)

  return (
    <div className="admin-pagination">
      <span className="admin-pagination-info">
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </span>
      <div className="admin-pagination-controls">
        <select
          className="form-input admin-pagination-limit"
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          className="btn-outline admin-pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          «
        </button>
        <button
          className="btn-outline admin-pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ‹
        </button>
        <span className="admin-pagination-page">
          Page {page} of {safeTotalPages}
        </span>
        <button
          className="btn-outline admin-pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
        >
          ›
        </button>
        <button
          className="btn-outline admin-pagination-btn"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={page >= safeTotalPages}
        >
          »
        </button>
      </div>
    </div>
  )
}

export default AdminPagination
