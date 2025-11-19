import { type NextRequest, NextResponse } from "next/server"

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || "http://localhost:8000/api"

// Helper function to get token from request
function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "")
  }

  // Try cookie
  const tokenCookie = request.cookies.get("auth_token")
  if (tokenCookie?.value) {
    return tokenCookie.value
  }

  // Try session cookie
  const sessionCookie = request.cookies.get("session")
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value)
      return session.token || null
    } catch {
      return null
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized - No token provided" }, { status: 401 })
    }

    const response = await fetch(`${LARAVEL_API_URL}/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to fetch profile" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      data: data.user,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized - No token provided" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ success: false, message: "Name and email are required" }, { status: 400 })
    }

    const response = await fetch(`${LARAVEL_API_URL}/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        email,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to update profile" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: data.user,
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
