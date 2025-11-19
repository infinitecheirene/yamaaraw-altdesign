import { type NextRequest, NextResponse } from "next/server"

const LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL || "http://localhost:8000/api"

function getAuthTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Try to get token from cookies (if you store it there)
  const tokenFromCookie = request.cookies.get('auth_token')?.value
  if (tokenFromCookie) {
    return tokenFromCookie
  }
  
  return null
}

async function makeAuthenticatedRequest(endpoint: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${LARAVEL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      )
    }

    const data = await makeAuthenticatedRequest("/privacy-settings", token)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Privacy settings fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch privacy settings",
      },
      { status: error.message === "Authentication required" ? 401 : 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = await makeAuthenticatedRequest("/privacy-settings", token, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Privacy settings update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update privacy settings",
      },
      { status: error.message === "Authentication required" ? 401 : 500 },
    )
  }
}
