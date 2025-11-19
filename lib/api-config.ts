// API configuration utility
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || "http://localhost:8000"
  return `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`
}

// Response interface for consistent API responses
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

// Enhanced helper function for making authenticated requests to Laravel backend
export const makeAuthenticatedRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  try {
    const token = getAuthToken()
    console.log("Making authenticated request to:", getApiUrl(endpoint))
    console.log("Token available:", !!token)

    if (!token) {
      throw new Error("Authentication required")
    }

    const isFormData = options.body instanceof FormData
    const defaultHeaders: HeadersInit = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    }

    // Don't set Content-Type for FormData, let the browser set it
    if (!isFormData && options.method !== "GET") {
      defaultHeaders["Content-Type"] = "application/json"
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    console.log("Request config:", {
      url: getApiUrl(endpoint),
      method: mergedOptions.method || "GET",
      headers: mergedOptions.headers,
      hasBody: !!mergedOptions.body,
    })

    const response = await fetch(getApiUrl(endpoint), mergedOptions)
    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    // Handle different response types
    const contentType = response.headers.get("content-type")
    let data: any

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text()
      console.log("Response text:", text)
      data = text ? JSON.parse(text) : {}
    } else {
      data = await response.text()
      console.log("Non-JSON response:", data)
    }

    if (!response.ok) {
      console.error("Request failed:", {
        status: response.status,
        statusText: response.statusText,
        data,
      })
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    // Ensure we return a consistent ApiResponse structure
    if (typeof data === "object" && data !== null && "success" in data) {
      return data as ApiResponse<T>
    }

    // Wrap non-standard responses
    return {
      success: true,
      data: data as T,
    }
  } catch (error: any) {
    console.error("API request failed:", error)
    return {
      success: false,
      message: error.message || "Request failed",
    }
  }
}

// Direct Laravel API calls (bypassing Next.js API routes)
export const makeDirectLaravelRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  // Ensure the endpoint starts with /api for Laravel routes
  const laravelEndpoint = endpoint.startsWith("") ? endpoint : `/api${endpoint}`
  return makeAuthenticatedRequest<T>(laravelEndpoint, options)
}

// Legacy function that returns Response object (for backward compatibility)
export const makeAuthenticatedRequestRaw = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken()
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  // Remove Content-Type for FormData requests
  if (options.body instanceof FormData) {
    delete (mergedOptions.headers as any)["Content-Type"]
  }

  return fetch(getApiUrl(endpoint), mergedOptions)
}

// Get auth token helper
function getAuthToken(): string | null {
  try {
    if (typeof window === "undefined") return null
    const sessionData = localStorage.getItem("session")
    if (!sessionData) return null
    const session = JSON.parse(sessionData)
    return session.token || null
  } catch (error) {
    console.error("Error getting auth token:", error)
    return null
  }
}

// Utility function for handling API responses
export const handleApiResponse = async <T = any>(response: Response): Promise<ApiResponse<T>> => {
  try {
    const contentType = response.headers.get("content-type")
    let data: any

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text()
      data = text ? JSON.parse(text) : {}
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    // Ensure we return a consistent ApiResponse structure
    if (typeof data === "object" && data !== null && "success" in data) {
      return data as ApiResponse<T>
    }

    // Wrap non-standard responses
    return {
      success: true,
      data: data as T,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Request failed",
    }
  }
}

// Export the ApiResponse type for use in other files
export type { ApiResponse }
