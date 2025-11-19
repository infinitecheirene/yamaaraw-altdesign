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

    const response = await fetch(`${LARAVEL_API_URL}/profile/notifications`, {
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
        { success: false, message: data.message || "Failed to fetch notification settings" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    })
  } catch (error) {
    console.error("Notification settings fetch error:", error)
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
    const { orderUpdates, promotions, newsletter, sms } = body

    // Convert camelCase to snake_case for Laravel
    const notificationData = {
      order_updates: orderUpdates,
      promotions,
      newsletter,
      sms,
    }

    const response = await fetch(`${LARAVEL_API_URL}/profile/notifications`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(notificationData),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to update notification settings" },
        { status: response.status },
      )
    }

    // Convert snake_case back to camelCase for frontend
    const responseData = data.data
      ? {
          order_updates: data.data.order_updates,
          promotions: data.data.promotions,
          newsletter: data.data.newsletter,
          sms: data.data.sms,
          updated_at: data.data.updated_at,
        }
      : null

    return NextResponse.json({
      success: true,
      message: "Notification settings updated successfully",
      data: responseData,
    })
  } catch (error) {
    console.error("Notification settings update error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
