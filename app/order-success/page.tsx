"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { CheckCircle, Package, Truck, Calendar, ArrowRight, MapPin, Phone, Mail, Clock } from "lucide-react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"

interface Order {
  id: number
  order_number: string
  status: string
  total: number
  created_at: string
  estimated_delivery_date?: string // Add this field
  items: Array<{
    id: number
    product: {
      name: string
      model?: string
      images: string[]
    }
    quantity: number
    price: number
    color?: string
  }>
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  barangay: string
  city: string
  province: string
  region?: string
  zip_code: string
  payment_method: string
  payment_status?: string
  subtotal: number
  shipping_fee: number
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const orderNumber = searchParams.get("orderNumber")

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
      return
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId, router])

  const fetchOrder = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error("No auth token found")
        router.push("/login")
        return
      }

      console.log("Fetching order:", orderId)
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log("Raw response:", text)

      if (!text) {
        throw new Error("Empty response from server")
      }

      const data = JSON.parse(text)
      console.log("Parsed data:", data)

      if (data.success) {
        setOrder(data.data)
      } else {
        console.error("API returned error:", data.message)
      }
    } catch (error) {
      console.error("Error fetching order:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAuthToken = () => {
    try {
      const sessionData = localStorage.getItem("session")
      if (!sessionData) return null
      const session = JSON.parse(sessionData)
      return session.token || null
    } catch (error) {
      return null
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "processing":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "paid":
        return "bg-green-100 text-green-800 border-green-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      case "refunded":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatEstimatedDelivery = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const formattedDate = date.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    if (diffDays === 0) {
      return { text: formattedDate, status: "Today!" }
    } else if (diffDays === 1) {
      return { text: formattedDate, status: "Tomorrow" }
    } else if (diffDays > 0) {
      return { text: formattedDate, status: `In ${diffDays} days` }
    } else {
      return { text: formattedDate, status: "Overdue" }
    }
  }

  const formatAddress = (order: Order) => {
    const addressParts = [
      order.address,
      order.barangay && order.city ? `${order.barangay}, ${order.city}` : order.city,
      order.province && order.region ? `${order.province}, ${order.region}` : order.province,
      order.zip_code,
    ].filter(Boolean)

    return addressParts.join("\n")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been received and is being processed.
          </p>
          {orderNumber && (
            <div className="mt-4">
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-lg px-4 py-2">
                Order #{orderNumber}
              </Badge>
            </div>
          )}
        </div>

        {order && (
          <div className="space-y-6">
            {/* Order Summary Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-xl">Order Details</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    {order.payment_status && (
                      <Badge className={getPaymentStatusColor(order.payment_status)}>
                        Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Package className="w-4 h-4 mr-2 text-orange-500" />
                      Order Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Number:</span>
                        <span className="font-medium">{order.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Date:</span>
                        <span className="font-medium">
                          {new Date(order.created_at).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {order.estimated_delivery_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Delivery:</span>
                          <span className="font-medium text-green-600">
                            {formatEstimatedDelivery(order.estimated_delivery_date).text}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium capitalize">
                          {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                        </span>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping Fee:</span>
                          <span className="font-medium">
                            {order.shipping_fee === 0 ? "Free" : formatPrice(order.shipping_fee)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                          <span className="text-gray-900">Total Amount:</span>
                          <span className="text-orange-600">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                      Shipping Address
                    </h3>
                    <div className="text-sm bg-gray-50 p-4 rounded-lg">
                      <p className="font-semibold text-gray-900 mb-2">
                        {order.first_name} {order.last_name}
                      </p>

                      <div className="space-y-1 text-gray-700 mb-3">
                        <p>{order.address}</p>
                        {order.barangay && <p>Barangay {order.barangay}</p>}
                        <p>{order.city}</p>
                        {order.province && order.province !== order.city && <p>{order.province}</p>}
                        {order.region && <p>{order.region}</p>}
                        <p className="font-medium">{order.zip_code}</p>
                      </div>

                      <div className="space-y-1 pt-3 border-t border-gray-200">
                        <p className="flex items-center">
                          <Phone className="w-3 h-3 mr-2 text-gray-500" />
                          <span className="font-medium">Phone:</span>
                          <span className="ml-1">{order.phone}</span>
                        </p>
                        <p className="flex items-center">
                          <Mail className="w-3 h-3 mr-2 text-gray-500" />
                          <span className="font-medium">Email:</span>
                          <span className="ml-1">{order.email}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  Items Ordered ({order.items.length} {order.items.length === 1 ? "item" : "items"})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={item.product.images[0] || "/placeholder.svg"}
                          alt={item.product.name}
                          fill
                          className="object-contain rounded-lg"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{item.product.name}</h4>
                        {item.product.model && <p className="text-sm text-gray-600">{item.product.model}</p>}
                        {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                        <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-orange-600">{formatPrice(item.price * item.quantity)}</p>
                        <p className="text-sm text-gray-500">{formatPrice(item.price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps with Estimated Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Package className="w-5 h-5 mr-2 text-orange-500" />
                  What's Next?
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Estimated Delivery Banner */}
                {order.estimated_delivery_date && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="w-6 h-6 text-green-600 mr-3" />
                        <div>
                          <h4 className="font-semibold text-green-900">Estimated Delivery</h4>
                          <p className="text-sm text-green-700">
                            {formatEstimatedDelivery(order.estimated_delivery_date).text}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        {formatEstimatedDelivery(order.estimated_delivery_date).status}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-orange-900 mb-1">Order Confirmation</h4>
                    <p className="text-sm text-orange-700">We'll send you an email confirmation shortly</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-900 mb-1">Processing</h4>
                    <p className="text-sm text-blue-700">Your order will be prepared for shipping</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <Truck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-green-900 mb-1">Delivery</h4>
                    <p className="text-sm text-green-700">Track your package until it arrives</p>
                  </div>
                </div>

                {/* Enhanced Delivery Information */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Delivery Information</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    {order.estimated_delivery_date ? (
                      <>
                        <p>
                          • <strong>Estimated delivery:</strong>{" "}
                          {formatEstimatedDelivery(order.estimated_delivery_date).text}
                        </p>
                        <p>• Delivery time may vary based on location and weather conditions</p>
                      </>
                    ) : (
                      <p>• Estimated delivery: 3-5 business days</p>
                    )}
                    <p>• You'll receive tracking information once your order ships</p>
                    <p>• For Cash on Delivery orders, please have exact change ready</p>
                    <p>• Contact us if you need to modify your delivery address</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push("/orders")}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Track Your Order
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/products")}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Support Information */}
            
          </div>
        )}

        {!order && !loading && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order not found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the order you're looking for. It may have been removed or you may not have permission to
              view it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push("/orders")}>
                <Package className="w-4 h-4 mr-2" />
                View All Orders
              </Button>
              <Button variant="outline" onClick={() => router.push("/products")}>
                Continue Shopping
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
