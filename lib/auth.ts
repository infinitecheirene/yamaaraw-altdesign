import type { User, AuthResponse } from "./types"
import { 
  setClientSession, 
  clearClientSession, 
  getCurrentUser as getClientUser,
  getAuthToken as getClientAuthToken,
  updateUserInSession
} from "./session"
import { transferGuestCart } from "./cart"

// Export the User type for external use
export type { User } from "./types"

export async function register(email: string, password: string, name: string): Promise<User | null> {
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    })

    const data: AuthResponse = await response.json()

    if (data.success && data.data) {
      // Create session data
      const sessionData = {
        user: data.data.user,
        token: data.data.token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }

      // Store session
      setClientSession(sessionData)

      // Transfer guest cart if exists
      try {
        await transferGuestCart()
      } catch (error) {
        console.warn("Failed to transfer guest cart:", error)
        // Don't fail registration if cart transfer fails
      }

      return data.data.user
    }

    throw new Error(data.message || "Registration failed")
  } catch (error) {
    console.error("Registration error:", error)
    throw error
  }
}

export async function login(email: string, password: string): Promise<{ user: User; redirectTo: string } | null> {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data: AuthResponse = await response.json()

    if (data.success && data.data) {
      // Create session data
      const sessionData = {
        user: data.data.user,
        token: data.data.token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }

      // Store session
      setClientSession(sessionData)

      // Transfer guest cart if exists
      try {
        await transferGuestCart()
      } catch (error) {
        console.warn("Failed to transfer guest cart:", error)
        // Don't fail login if cart transfer fails
      }

      // Determine redirect based on user role
      const redirectTo = data.data.user.role === "admin" ? "/admin" : "/"

      return {
        user: data.data.user,
        redirectTo,
      }
    }

    throw new Error(data.message || "Login failed")
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

export async function logout(): Promise<void> {
  try {
    const token = getAuthToken()

    if (token) {
      // Call logout API
      await fetch("/api/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    }
  } catch (error) {
    console.error("Logout error:", error)
  } finally {
    // Always clear session regardless of API call success
    clearClientSession()
  }
}

export function getCurrentUser(): User | null {
  return getClientUser()
}

export function getAuthToken(): string | null {
  return getClientAuthToken()
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function isAdmin(): boolean {
  const user = getCurrentUser()
  return user?.role === "admin"
}

// Update current user data
export function updateCurrentUser(updatedUser: User): void {
  updateUserInSession(updatedUser)
}

// Refresh user data from API
export async function refreshUserData(): Promise<User | null> {
  try {
    const token = getAuthToken()
    if (!token) {
      return null
    }

    const response = await fetch("/api/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to refresh user data")
    }

    const data = await response.json()
    
    if (data.success && data.data) {
      updateUserInSession(data.data)
      return data.data
    }

    return null
  } catch (error) {
    console.error("Error refreshing user data:", error)
    return null
  }
}

// Check if user session is still valid
export async function validateSession(): Promise<boolean> {
  try {
    const user = await refreshUserData()
    return user !== null
  } catch (error) {
    console.error("Session validation error:", error)
    return false
  }
}

// Force logout (clear session without API call)
export function forceLogout(): void {
  clearClientSession()
  window.location.href = "/login"
}
