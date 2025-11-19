import { type NextRequest, NextResponse } from "next/server"

const LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL || "http://localhost:8000/api"

function getAuthTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // Try to get token from cookies
  const tokenFromCookie = request.cookies.get("auth_token")?.value
  if (tokenFromCookie) {
    return tokenFromCookie
  }

  return null
}

async function makeAuthenticatedRequest(endpoint: string, token: string, options: RequestInit = {}) {
  console.log(`Making request to: ${LARAVEL_API_URL}${endpoint}`)
  console.log(`Token: ${token ? token.substring(0, 10) + "..." : "null"}`)

  const response = await fetch(`${LARAVEL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...options.headers,
    },
  })

  console.log(`Response status: ${response.status}`)
  const responseText = await response.text()
  console.log(`Response body: ${responseText}`)

  if (!response.ok) {
    let errorData
    try {
      errorData = JSON.parse(responseText)
    } catch {
      errorData = { message: `HTTP error! status: ${response.status}` }
    }
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }

  return JSON.parse(responseText)
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    console.log(`GET /payment-methods - Token: ${token ? "present" : "missing"}`)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required - no token provided",
        },
        { status: 401 },
      )
    }

    // Call the correct Laravel endpoint
    const data = await makeAuthenticatedRequest("/payment-methods", token)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Payment methods fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch payment methods",
      },
      { status: error.message?.includes("Authentication") ? 401 : 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required - no token provided",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const data = await makeAuthenticatedRequest("/payment-methods", token, {
      method: "POST",
      body: JSON.stringify(body),
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Payment method creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create payment method",
      },
      { status: error.message?.includes("Authentication") ? 401 : 500 },
    )
  }
}
