import { type NextRequest, NextResponse } from "next/server"

const LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL || "http://localhost:8000/api"

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

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized - No token provided" }, { status: 401 })
    }

    const formData = await request.formData()
    const profileImage = formData.get("profile_image") as File

    // Validate file
    if (!profileImage) {
      return NextResponse.json({ success: false, message: "No image file provided" }, { status: 400 })
    }

    // Validate file type
    if (!profileImage.type.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "Please select a valid image file" }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (profileImage.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Image size must be less than 5MB" }, { status: 400 })
    }

    const response = await fetch(`${LARAVEL_API_URL}/profile/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to upload image" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Profile image uploaded successfully",
      data: data.data,
    })
  } catch (error) {
    console.error("Image upload error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized - No token provided" }, { status: 401 })
    }

    const response = await fetch(`${LARAVEL_API_URL}/profile/image`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to remove image" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Profile image removed successfully",
      data: data.data,
    })
  } catch (error) {
    console.error("Image removal error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
