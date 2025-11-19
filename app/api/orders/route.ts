import { type NextRequest, NextResponse } from "next/server"

const NEXT_PUBLIC_LARAVEL_API_URL = process.env.NEXT_PUBLIC_LARAVEL_API_URL

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    // Orders listing requires authentication
    if (!authHeader) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const response = await fetch(`${NEXT_PUBLIC_LARAVEL_API_URL}/orders`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Orders GET error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const body = await request.json()

    // Since your checkout requires authentication, ensure auth header is present
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required for order creation",
        },
        { status: 401 },
      )
    }

    // Transform and validate the request body to match Laravel expectations
    const transformedBody = {
      items: body.items || [],
      shipping_info: {
        firstName: body.shipping_info?.firstName || "",
        lastName: body.shipping_info?.lastName || "",
        email: body.shipping_info?.email || "",
        phone: body.shipping_info?.phone || "",
        address: body.shipping_info?.address || "",
        barangay: body.shipping_info?.barangay || "",
        city: body.shipping_info?.city || "",
        province: body.shipping_info?.province || "",
        region: body.shipping_info?.region || "",
        zipCode: body.shipping_info?.zipCode || "",
      },
      payment_method: body.payment_method || "cod",
      payment_details: body.payment_details || {},
      subtotal: Number.parseFloat(body.subtotal || 0),
      shipping_fee: Number.parseFloat(body.shipping_fee || 0),
      total: Number.parseFloat(body.total || 0),
      is_guest: false, // Always false since authentication is required
    }

    // Validate required fields before sending to Laravel
    const validationErrors = validateOrderData(transformedBody)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        },
        { status: 422 },
      )
    }

    console.log("Creating order:", {
      hasAuth: !!authHeader,
      paymentMethod: transformedBody.payment_method,
      itemsCount: transformedBody.items.length,
      total: transformedBody.total,
      shippingInfo: {
        region: transformedBody.shipping_info.region,
        city: transformedBody.shipping_info.city,
        barangay: transformedBody.shipping_info.barangay,
      },
    })

    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader,
    }

    const response = await fetch(`${NEXT_PUBLIC_LARAVEL_API_URL}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(transformedBody),
    })

    const data = await response.json()

    console.log("Order creation response:", {
      status: response.status,
      success: data.success,
      message: data.message,
      errors: data.errors || null,
    })

    // If there are validation errors, log them for debugging
    if (!response.ok && data.errors) {
      console.error("Laravel validation errors:", data.errors)
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Orders POST error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper function to validate order data
function validateOrderData(body: any): string[] {
  const errors: string[] = []

  // Validate items
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push("Items are required and must be a non-empty array")
  } else {
    body.items.forEach((item: any, index: number) => {
      if (!item.product_id) {
        errors.push(`Item ${index + 1}: product_id is required`)
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: quantity must be at least 1`)
      }
      if (!item.price || item.price < 0) {
        errors.push(`Item ${index + 1}: price must be a positive number`)
      }
    })
  }

  // Validate shipping info
  const requiredShippingFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "barangay",
    "city",
    "province",
    "region",
    "zipCode",
  ]

  requiredShippingFields.forEach((field) => {
    if (!body.shipping_info?.[field] || body.shipping_info[field].trim() === "") {
      errors.push(`Shipping info: ${field} is required`)
    }
  })

  // Validate email format
  if (body.shipping_info?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.shipping_info.email)) {
      errors.push("Shipping info: email must be a valid email address")
    }
  }

  // Validate phone format (Philippine format)
  if (body.shipping_info?.phone) {
    const phoneRegex = /^09\d{9}$/
    if (!phoneRegex.test(body.shipping_info.phone)) {
      errors.push("Shipping info: phone must be a valid 11-digit Philippine number starting with 09")
    }
  }

  // Validate payment method (removed installment)
  const validPaymentMethods = ["cod", "gcash", "maya", "bank_transfer"]
  if (!validPaymentMethods.includes(body.payment_method)) {
    errors.push("Payment method must be one of: " + validPaymentMethods.join(", "))
  }

  // Validate payment details based on payment method
  if (body.payment_method === "bank_transfer") {
    if (!body.payment_details?.bankAccount) {
      errors.push("Payment details: bankAccount is required for bank transfer payments")
    }
  }

  // Validate amounts
  if (body.subtotal < 0) {
    errors.push("Subtotal must be a positive number")
  }
  if (body.shipping_fee < 0) {
    errors.push("Shipping fee must be a positive number")
  }
  if (body.total <= 0) {
    errors.push("Total must be a positive number")
  }

  return errors
}
