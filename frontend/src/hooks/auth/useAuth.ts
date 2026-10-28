import { useState } from "react"

const API_URL = `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api`
const USER_STORAGE_KEY = "auth-user"

export type AuthUser = {
  id: string
  email: string
  isOnboarded: boolean
  profile?: {
    firstName?: string
    lastName?: string
    exactDegreeTitle?: string
    school?: string
    searchDomain?: string
    homeAddress?: HomeAddress
    [key: string]: string | HomeAddress | undefined
  }
}

type AuthResponse = {
  success: boolean
  message: string
  token: string
  data: AuthUser
}

type Credentials = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  targetRole?: string
}

type ResetPasswordCredentials = {
  email: string
  code: string
  newPassword: string
}

type ChangePasswordCredentials = {
  currentPassword: string
  newPassword: string
}

export type HomeAddress = {
  label: string
  postcode: string
  city: string
  latitude: number
  longitude: number
}

export type OnboardingProfile = {
  firstName: string
  lastName: string
  educationLevel: string
  currentDegree: string
  exactDegreeTitle: string
  school: string
  searchDomain: string
  contractType: string
  contractDuration: string
  rhythm: string
  location: string
  homeAddress?: HomeAddress
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser =
      localStorage.getItem(USER_STORAGE_KEY) ??
      sessionStorage.getItem(USER_STORAGE_KEY)

    if (!storedUser) return null

    try {
      return JSON.parse(storedUser) as AuthUser
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY)
      sessionStorage.removeItem(USER_STORAGE_KEY)
      return null
    }
  })

  const authenticate = async (
    endpoint: "login" | "register",
    credentials: Credentials,
    rememberMe = true
  ) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      })
      const data = (await response.json()) as Partial<AuthResponse>

      if (!response.ok || !data.token || !data.data) {
        throw new Error(data.message ?? "Une erreur est survenue.")
      }

      if (rememberMe) {
        localStorage.setItem("token", data.token)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data))
        sessionStorage.removeItem("token")
        sessionStorage.removeItem(USER_STORAGE_KEY)
      } else {
        sessionStorage.setItem("token", data.token)
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data))
        localStorage.removeItem("token")
        localStorage.removeItem(USER_STORAGE_KEY)
      }
      setUser(data.data)
      return data
    } catch (requestError) {
      const message =
        requestError instanceof TypeError
          ? "Impossible de joindre le serveur."
          : requestError instanceof Error
            ? requestError.message
            : "Une erreur est survenue."
      setError(message)
      if (requestError instanceof Error) throw requestError
      throw new Error(message, { cause: requestError })
    } finally {
      setIsLoading(false)
    }
  }

  const login = (credentials: Credentials, rememberMe: boolean) =>
    authenticate("login", credentials, rememberMe)

  const register = (credentials: Credentials) =>
    authenticate("register", credentials)

  const resetPassword = async (credentials: ResetPasswordCredentials) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      })
      const data = (await response.json()) as { message?: string }
      if (!response.ok) {
        throw new Error(data.message ?? "Une erreur est survenue.")
      }
      return data
    } catch (requestError) {
      const message =
        requestError instanceof TypeError
          ? "Impossible de joindre le serveur."
          : requestError instanceof Error
            ? requestError.message
            : "Une erreur est survenue."
      setError(message)
      if (requestError instanceof Error) throw requestError
      throw new Error(message, { cause: requestError })
    } finally {
      setIsLoading(false)
    }
  }

  const changePassword = async (credentials: ChangePasswordCredentials) => {
    setIsLoading(true)
    setError("")

    try {
      const token =
        localStorage.getItem("token") ?? sessionStorage.getItem("token")
      const response = await fetch(`${API_URL}/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(credentials),
      })
      const data = (await response.json()) as { message?: string }
      if (!response.ok) {
        throw new Error(data.message ?? "Une erreur est survenue.")
      }

      return data
    } catch (requestError) {
      const message =
        requestError instanceof TypeError
          ? "Impossible de joindre le serveur."
          : requestError instanceof Error
            ? requestError.message
            : "Une erreur est survenue."
      setError(message)
      if (requestError instanceof Error) throw requestError
      throw new Error(message, { cause: requestError })
    } finally {
      setIsLoading(false)
    }

  }

  const completeOnboarding = async (profile: OnboardingProfile) => {
    setIsLoading(true)
    setError("")

    try {
      const token =
        localStorage.getItem("token") ?? sessionStorage.getItem("token")
      const response = await fetch(`${API_URL}/auth/onboarding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profile }),
      })
      const data = (await response.json()) as Partial<AuthResponse>

      if (!response.ok || !data.data) {
        throw new Error(data.message ?? "Impossible de sauvegarder le profil.")
      }

      const storage = localStorage.getItem("token")
        ? localStorage
        : sessionStorage
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data))
      setUser(data.data)
      return data.data
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Impossible de sauvegarder le profil."
      setError(message)
      if (requestError instanceof Error) throw requestError
      throw new Error(message, { cause: requestError })
    } finally {
      setIsLoading(false)
    }

  }

  const updateProfile = async (profile: OnboardingProfile) => {
    setIsLoading(true)
    setError("")

    try {
      const token =
        localStorage.getItem("token") ?? sessionStorage.getItem("token")
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profile }),
      })
      const data = (await response.json()) as Partial<AuthResponse>

      if (!response.ok || !data.data) {
        throw new Error(data.message ?? "Impossible de sauvegarder le profil.")
      }

      const storage = localStorage.getItem("token")
        ? localStorage
        : sessionStorage
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(data.data))
      setUser(data.data)
      return data.data
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Impossible de sauvegarder le profil."
      setError(message)
      if (requestError instanceof Error) throw requestError
      throw new Error(message, { cause: requestError })
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    sessionStorage.removeItem("token")
    localStorage.removeItem(USER_STORAGE_KEY)
    sessionStorage.removeItem(USER_STORAGE_KEY)
    setUser(null)
  }

  return {
    login,
    register,
    resetPassword,
    changePassword,
    completeOnboarding,
    updateProfile,
    logout,
    user,
    isLoading,
    error,
    isAuthenticated: Boolean(
      localStorage.getItem("token") || sessionStorage.getItem("token")
    ),
  }
}
