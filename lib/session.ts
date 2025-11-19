import type { NextRequest } from "next/server"
import type { User } from "./types"

export interface SessionData {
  user: User
  token: string
  expires: string
}

// Get session from request (for API routes)
export function getSessionFromRequest(request: NextRequest): SessionData | null {
  try {
    const sessionCookie = request.cookies.get("session")
    if (!sessionCookie?.value) {
      return null
    }

    const sessionData = JSON.parse(sessionCookie.value)

    // Check if session is expired
    if (new Date(sessionData.expires) < new Date()) {
      return null
    }

    // Validate session structure
    if (!sessionData.user || !sessionData.token || !sessionData.expires) {
      return null
    }

    return sessionData as SessionData
  } catch (error) {
    console.error("Error getting session from request:", error)
    return null
  }
}

// Client-side session helpers
export function getClientSession(): SessionData | null {
  if (typeof window === "undefined") return null

  try {
    const sessionStr = localStorage.getItem("session")
    if (!sessionStr) return null

    const sessionData = JSON.parse(sessionStr)

    // Check if session is expired
    if (new Date(sessionData.expires) < new Date()) {
      localStorage.removeItem("session")
      localStorage.removeItem("user") // Also remove user data
      return null
    }

    // Validate session structure
    if (!sessionData.user || !sessionData.token || !sessionData.expires) {
      localStorage.removeItem("session")
      localStorage.removeItem("user")
      return null
    }

    return sessionData as SessionData
  } catch (error) {
    console.error("Error getting client session:", error)
    // Clear corrupted session data
    localStorage.removeItem("session")
    localStorage.removeItem("user")
    return null
  }
}

export function setClientSession(sessionData: SessionData): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("session", JSON.stringify(sessionData))
    localStorage.setItem("user", JSON.stringify(sessionData.user))
  } catch (error) {
    console.error("Error setting client session:", error)
  }
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem("session")
    localStorage.removeItem("user")
    localStorage.removeItem("cart") // Also clear cart on logout
  } catch (error) {
    console.error("Error clearing client session:", error)
  }
}

// Client-side getCurrentUser function
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  try {
    // First try to get from session
    const session = getClientSession()
    if (session?.user) {
      return session.user
    }

    // Fallback to user data (for backward compatibility)
    const userStr = localStorage.getItem("user")
    if (!userStr) return null

    const user = JSON.parse(userStr)

    // Validate user structure
    if (user && typeof user.id === "number" && user.name && user.email && user.role) {
      return user as User
    }

    return null
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

// Client-side getAuthToken function
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  const session = getClientSession()
  return session?.token || null
}

// Update user in session
export function updateUserInSession(updatedUser: User): void {
  if (typeof window === "undefined") return

  try {
    const session = getClientSession()
    if (session) {
      const updatedSession: SessionData = {
        ...session,
        user: updatedUser
      }
      setClientSession(updatedSession)
    } else {
      // If no session exists, just update the user data
      localStorage.setItem("user", JSON.stringify(updatedUser))
    }
  } catch (error) {
    console.error("Error updating user in session:", error)
  }
}

// Check if session is valid
export function isSessionValid(): boolean {
  const session = getClientSession()
  return session !== null
}
