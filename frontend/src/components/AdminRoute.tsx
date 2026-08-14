import React from 'react'
import { Navigate } from 'react-router-dom'

type Props = {
  token: string | null
  role: string | null
  children: React.ReactNode
}

const AdminRoute: React.FC<Props> = ({ token, role, children }) => {
  if (!token || role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default AdminRoute
