import { type NextRequest, NextResponse } from "next/server"

const NEXT_PUBLIC_LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    // Get the form data (for file upload)
    const formData = await request.formData()

    console.log("Uploading screenshot to Laravel API...")

    // Forward the request to Laravel with the correct endpoint
    const response = await fetch(`${NEXT_PUBLIC_LARAVEL_API_URL}/orders/upload-payment-screenshot`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        // Don't set Content-Type for FormData, let the browser set it
      },
      body: formData,
    })

    const data = await response.json()

    console.log("Screenshot upload response:", {
      status: response.status,
      success: data.success,
      filename: data.filename,
      message: data.message,
    })

    if (!response.ok) {
      console.error("Laravel API error:", data)
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Upload failed",
        },
        { status: response.status },
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Screenshot upload error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload screenshot",
      },
      { status: 500 },
    )
  }
}
