import { type NextRequest, NextResponse } from "next/server"

const LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL || "http://localhost:8000/api"

function getAuthTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  const tokenFromCookie = request.cookies.get("auth_token")?.value
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getAuthTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    const data = await makeAuthenticatedRequest(`/payment-methods/${params.id}`, token)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Payment method fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch payment method",
      },
      { status: error.message === "Authentication required" ? 401 : 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getAuthTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const data = await makeAuthenticatedRequest(`/payment-methods/${params.id}`, token, {
      method: "PUT",
      body: JSON.stringify(body),
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Payment method update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update payment method",
      },
      { status: error.message === "Authentication required" ? 401 : 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getAuthTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    const data = await makeAuthenticatedRequest(`/payment-methods/${params.id}`, token, {
      method: "DELETE",
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Payment method deletion error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete payment method",
      },
      { status: error.message === "Authentication required" ? 401 : 500 },
    )
  }
}
