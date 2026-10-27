import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useAuth } from "@/hooks/auth/useAuth"

type RouteGuardProps = {
  children: ReactNode
}

export function ProtectedRoute({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export function PublicOnlyRoute({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
