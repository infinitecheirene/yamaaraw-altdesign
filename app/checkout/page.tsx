"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  ArrowLeft,
  CreditCard,
  Truck,
  Shield,
  MapPin,
  Phone,
  Mail,
  User,
  UserPlus,
  Lock,
  Clock,
  Smartphone,
  Wallet,
  Building2,
  Copy,
  Check,
  Upload,
  X,
  FileImage,
} from "lucide-react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCart, clearCartAfterCheckout } from "@/lib/cart"
import { getCurrentUser, login, register } from "@/lib/auth"
import { useCart } from "@/contexts/cart-context"
import { useNotifications } from "@/contexts/notification-context"
import { useClientToast } from "@/hooks/use-client-toast"
import type { CartItem } from "@/lib/cart"

type CheckoutMode = "login" | "register" | "authenticated"
type PaymentMethod = "cod" | "gcash" | "maya" | "bank_transfer"

interface AddressData {
  regions: Array<{ code: string; name: string; type: string }>
  provinces: Array<{ code: string; name: string; regionCode: string }>
  cities: Array<{
    code: string
    name: string
    provinceCode?: string
    regionCode?: string
  }>
  barangays: Array<{ code: string; name: string; cityCode: string }>
}

interface PaymentDetails {
  paymentScreenshot: string | null
  paymentScreenshotFile: File | null
  bankAccount: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { refreshCart } = useCart()
  const { refreshNotifications } = useNotifications()
  const toast = useClientToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("login")
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("")
  const [copiedField, setCopiedField] = useState<string>("")
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false)

  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    barangay: "",
    city: "",
    province: "",
    zipCode: "",
    region: "",
  })

  const [authInfo, setAuthInfo] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  })

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod")
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    paymentScreenshot: null,
    paymentScreenshotFile: null,
    bankAccount: "",
  })

  const [addressData, setAddressData] = useState<AddressData>({
    regions: [],
    provinces: [],
    cities: [],
    barangays: [],
  })

  const [selectedCodes, setSelectedCodes] = useState({
    regionCode: "",
    provinceCode: "",
    cityCode: "",
    barangayCode: "",
  })

  const [filteredData, setFilteredData] = useState({
    provinces: [] as Array<{ code: string; name: string; regionCode: string }>,
    cities: [] as Array<{
      code: string
      name: string
      provinceCode?: string
      regionCode?: string
    }>,
    barangays: [] as Array<{ code: string; name: string; cityCode: string }>,
  })

  const [loadingAddress, setLoadingAddress] = useState({
    initial: false,
    provinces: false,
    cities: false,
    barangays: false,
  })

  const shopBankDetails = {
    shopName: "YAMAARAW ELECTRIC VEHICLE SHOP",
    bpi: {
      accountName: "YAMAARAW ELECTRIC VEHICLE SHOP",
      accountNumber: "1234-5678-90",
      bankName: "Bank of the Philippine Islands (BPI)",
      code: "bpi",
    },
    bdo: {
      accountName: "YAMAARAW ELECTRIC VEHICLE SHOP",
      accountNumber: "9876-5432-10",
      bankName: "Banco de Oro (BDO)",
      code: "bdo",
    },
    gcash: {
      name: "YAMAARAW",
      number: "09456754591",
    },
    maya: {
      name: "YAMAARAW",
      number: "09456754591",
    },
  }

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCheckoutMode("authenticated")
      const nameParts = user.name.split(" ")
      setShippingInfo((prev) => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: user.email,
      }))
    } else {
      setCheckoutMode("login")
    }

    fetchCart()
    initializeAddressData()
  }, [])

  const fetchCart = async () => {
    try {
      const cartItems = await getCart()
      setCart(cartItems)
      if (cartItems.length === 0) {
        router.push("/cart")
        return
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
      toast.error("Failed to Load", "Could not load cart items")
    } finally {
      setLoading(false)
    }
  }

  const calculateEstimatedDelivery = (region: string) => {
    const deliveryMap: { [key: string]: number } = {
      "National Capital Region (NCR)": 1,
      CALABARZON: 2,
      "Central Luzon": 2,
      "Central Visayas": 4,
      "Western Visayas": 4,
      "Eastern Visayas": 5,
      "Northern Mindanao": 5,
      "Davao Region": 5,
      SOCCSKSARGEN: 6,
      "Zamboanga Peninsula": 6,
      CARAGA: 6,
      ARMM: 7,
      "Cordillera Administrative Region (CAR)": 4,
      "Ilocos Region": 3,
      "Cagayan Valley": 4,
      MIMAROPA: 5,
      "Bicol Region": 4,
    }

    const deliveryDays = deliveryMap[region] || 3
    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays)

    while (estimatedDate.getDay() === 0 || estimatedDate.getDay() === 6) {
      estimatedDate.setDate(estimatedDate.getDate() + 1)
    }

    return estimatedDate.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const initializeAddressData = async () => {
    setLoadingAddress((prev) => ({ ...prev, initial: true }))
    try {
      await Promise.all([fetchRegionsAndProvinces(), fetchAllCities()])
    } catch (error) {
      console.error("Error initializing address data:", error)
      toast.error("Address Error", "Failed to load address data")
    } finally {
      setLoadingAddress((prev) => ({ ...prev, initial: false }))
    }
  }

  const fetchRegionsAndProvinces = async () => {
    try {
      const regionsResponse = await fetch("https://psgc.gitlab.io/api/regions/")
      const regions = await regionsResponse.json()
      const enhancedRegions = regions.sort((a: any, b: any) => a.name.localeCompare(b.name))
      setAddressData((prev) => ({ ...prev, regions: enhancedRegions }))

      const provincesPromises = enhancedRegions.map(async (region: any) => {
        try {
          if (region.code === "130000000") {
            const response = await fetch(`https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/`)
            const ncrCities = await response.json()
            return ncrCities.map((city: any) => ({
              code: city.code,
              name: city.name,
              regionCode: "130000000",
              regionName: "National Capital Region (NCR)",
              isNCRCity: true,
            }))
          } else {
            const response = await fetch(`https://psgc.gitlab.io/api/regions/${region.code}/provinces/`)
            const provinces = await response.json()
            return provinces.map((province: any) => ({
              ...province,
              regionCode: region.code,
              regionName: region.name,
            }))
          }
        } catch (error) {
          console.error(`Error fetching provinces for region ${region.name}:`, error)
          return []
        }
      })

      const allProvincesArrays = await Promise.all(provincesPromises)
      const allProvinces = allProvincesArrays.flat()
      setAddressData((prev) => ({ ...prev, provinces: allProvinces }))
    } catch (error) {
      console.error("Error fetching regions and provinces:", error)
      throw error
    }
  }

  const fetchAllCities = async () => {
    try {
      const allCitiesResponse = await fetch("https://psgc.gitlab.io/api/cities-municipalities/")
      const allCities = await allCitiesResponse.json()
      setAddressData((prev) => ({ ...prev, cities: allCities }))
    } catch (error) {
      console.error("Error fetching all cities:", error)
    }
  }

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regionCode = e.target.value
    const selectedRegion = addressData.regions.find((r) => r.code === regionCode)

    if (selectedRegion) {
      setSelectedCodes((prev) => ({
        ...prev,
        regionCode,
        provinceCode: "",
        cityCode: "",
        barangayCode: "",
      }))

      setShippingInfo((prev) => ({
        ...prev,
        region: selectedRegion.name,
        province: "",
        city: "",
        barangay: "",
      }))

      const delivery = calculateEstimatedDelivery(selectedRegion.name)
      setEstimatedDelivery(delivery)

      const regionProvinces = addressData.provinces.filter((p) => p.regionCode === regionCode)
      setFilteredData((prev) => ({
        ...prev,
        provinces: regionProvinces,
        cities: [],
        barangays: [],
      }))
    }
  }

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value
    const selectedProvince = filteredData.provinces.find((p) => p.code === provinceCode)

    if (selectedProvince) {
      setSelectedCodes((prev) => ({
        ...prev,
        provinceCode,
        cityCode: "",
        barangayCode: "",
      }))

      if (selectedProvince.regionCode === "130000000" && (selectedProvince as any).isNCRCity) {
        setSelectedCodes((prev) => ({
          ...prev,
          cityCode: provinceCode,
        }))

        setShippingInfo((prev) => ({
          ...prev,
          province: "Metro Manila",
          city: selectedProvince.name,
        }))

        await fetchBarangays(provinceCode)
      } else {
        setShippingInfo((prev) => ({
          ...prev,
          province: selectedProvince.name,
          city: "",
          barangay: "",
        }))

        await fetchCitiesForProvince(provinceCode)
      }
    }
  }

  const fetchCitiesForProvince = async (provinceCode: string) => {
    setLoadingAddress((prev) => ({ ...prev, cities: true }))
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`)
      const cities = await response.json()
      setFilteredData((prev) => ({
        ...prev,
        cities,
        barangays: [],
      }))
    } catch (error) {
      console.error("Error fetching cities:", error)
      toast.error("Address Error", "Failed to load cities")
    } finally {
      setLoadingAddress((prev) => ({ ...prev, cities: false }))
    }
  }

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityCode = e.target.value
    const selectedCity = filteredData.cities.find((c) => c.code === cityCode)

    if (selectedCity) {
      setSelectedCodes((prev) => ({
        ...prev,
        cityCode,
        barangayCode: "",
      }))

      setShippingInfo((prev) => ({
        ...prev,
        city: selectedCity.name,
        barangay: "",
      }))

      await fetchBarangays(cityCode)
    }
  }

  const fetchBarangays = async (cityCode: string) => {
    setLoadingAddress((prev) => ({ ...prev, barangays: true }))
    try {
      const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`)
      const barangays = await response.json()
      setFilteredData((prev) => ({
        ...prev,
        barangays,
      }))
    } catch (error) {
      console.error("Error fetching barangays:", error)
      toast.error("Address Error", "Failed to load barangays")
    } finally {
      setLoadingAddress((prev) => ({ ...prev, barangays: false }))
    }
  }

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const barangayCode = e.target.value
    const selectedBarangay = filteredData.barangays.find((b) => b.code === barangayCode)

    if (selectedBarangay) {
      setSelectedCodes((prev) => ({
        ...prev,
        barangayCode,
      }))

      setShippingInfo((prev) => ({
        ...prev,
        barangay: selectedBarangay.name,
      }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "")
      const limitedDigits = digitsOnly.slice(0, 11)
      setShippingInfo({
        ...shippingInfo,
        [name]: limitedDigits,
      })
    } else if (name === "firstName" || name === "lastName") {
      const lettersOnly = value.replace(/[^a-zA-Z\s'-]/g, "")
      setShippingInfo({
        ...shippingInfo,
        [name]: lettersOnly,
      })
    } else if (name === "zipCode") {
      const numbersOnly = value.replace(/\D/g, "")
      setShippingInfo({
        ...shippingInfo,
        [name]: numbersOnly,
      })
    } else {
      setShippingInfo({
        ...shippingInfo,
        [name]: value,
      })
    }
  }

  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setAuthInfo({
      ...authInfo,
      [name]: value,
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File", "Please upload an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Please upload an image smaller than 5MB")
      return
    }

    setIsUploadingScreenshot(true)
    try {
      const formData = new FormData()
      formData.append("screenshot", file)

      const token = getAuthToken()
      const response = await fetch("/api/orders/upload-payment-screenshot", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        setPaymentDetails({
          ...paymentDetails,
          paymentScreenshot: result.filename,
          paymentScreenshotFile: file,
        })
        toast.success("File Uploaded", "Payment screenshot uploaded successfully")
      } else {
        throw new Error(result.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Upload Failed", error instanceof Error ? error.message : "Failed to upload screenshot")
    } finally {
      setIsUploadingScreenshot(false)
    }
  }

  const removeUploadedFile = () => {
    setPaymentDetails({
      ...paymentDetails,
      paymentScreenshot: null,
      paymentScreenshotFile: null,
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    try {
      const result = await login(authInfo.email, authInfo.password)
      if (result) {
        toast.authSuccess(`Welcome back, ${result.user.name}!`)
        const nameParts = result.user.name.split(" ")
        setShippingInfo((prev) => ({
          ...prev,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: result.user.email,
        }))
        setCheckoutMode("authenticated")
        await refreshCart()
      }
    } catch (error: any) {
      toast.error("Login Failed", error.message || "Invalid credentials")
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authInfo.password !== authInfo.confirmPassword) {
      toast.error("Password Mismatch", "Passwords do not match")
      return
    }

    setIsAuthenticating(true)
    try {
      const user = await register(authInfo.email, authInfo.password, authInfo.name)
      if (user) {
        toast.authSuccess(`Welcome, ${user.name}!`)
        const nameParts = user.name.split(" ")
        setShippingInfo((prev) => ({
          ...prev,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: user.email,
        }))
        setCheckoutMode("authenticated")
        await refreshCart()
      }
    } catch (error: any) {
      toast.error("Registration Failed", error.message || "Registration failed")
    } finally {
      setIsAuthenticating(false)
    }
  }

  const validateForm = () => {
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "barangay",
      "city",
      "province",
      "zipCode",
      "region",
    ]

    for (const field of requiredFields) {
      if (!shippingInfo[field as keyof typeof shippingInfo].trim()) {
        toast.error("Validation Error", `Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`)
        return false
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(shippingInfo.email)) {
      toast.error("Validation Error", "Please enter a valid email address")
      return false
    }

    const phoneRegex = /^[0-9]{11}$/
    if (!phoneRegex.test(shippingInfo.phone)) {
      toast.error("Validation Error", "Please enter a valid 11-digit Philippine phone number")
      return false
    }

    if (!shippingInfo.phone.startsWith("09")) {
      toast.error("Validation Error", "Phone number should start with 09 (e.g., 09123456789)")
      return false
    }

    if (paymentMethod === "gcash" || paymentMethod === "maya" || paymentMethod === "bank_transfer") {
      if (!paymentDetails.paymentScreenshot) {
        toast.error("Validation Error", "Please upload your payment screenshot")
        return false
      }
    }

    if (paymentMethod === "bank_transfer") {
      if (!paymentDetails.bankAccount) {
        toast.error("Validation Error", "Please select a bank account")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsProcessing(true)

    try {
      const token = getAuthToken()
      if (!token) {
        toast.error("Authentication Error", "Please log in again to continue")
        setCheckoutMode("login")
        setIsProcessing(false)
        return
      }

      const orderData = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          color: item.color,
        })),
        shipping_info: shippingInfo,
        payment_method: paymentMethod,
        payment_details: {
          paymentScreenshot: paymentDetails.paymentScreenshot,
          ...(paymentMethod === "bank_transfer" && { bankAccount: paymentDetails.bankAccount }),
        },
        subtotal: subtotal,
        shipping_fee: shipping,
        total: total,
        is_guest: false,
      }

      console.log("Sending order with shipping info:", shippingInfo)

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(orderData),
      })

      console.log("Order response status:", response.status)
      const result = await response.json()
      console.log("Order response:", result)

      if (result.success) {
        // Clear cart first
        const cartCleared = await clearCartAfterCheckout()
        if (cartCleared) {
          await refreshCart()
        }

        // Show ONLY the custom order placed notification
        toast.orderPlaced(result.data.order_number)

        // Navigate to success page immediately
        router.push(`/order-success?orderId=${result.data.id}&orderNumber=${result.data.order_number}`)

        // Don't refresh notifications immediately to avoid duplicates
        // The success page will handle showing any additional notifications if needed
      } else {
        throw new Error(result.message || "Order failed")
      }
    } catch (error) {
      console.error("Error placing order:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast.error("Order Failed", errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const getAuthToken = () => {
    try {
      const sessionData = localStorage.getItem("session")
      if (!sessionData) {
        console.log("No session data found")
        return null
      }

      const session = JSON.parse(sessionData)
      const token = session.token

      if (!token) {
        console.log("No token in session data")
        return null
      }

      console.log("Token retrieved successfully")
      return token
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const formatPrice = (price: number) => {
    if (!price || isNaN(price) || price === null || price === undefined) {
      return "₱0.00"
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const calculateSafeTotal = (cart: CartItem[]) => {
    return cart.reduce((total, item) => {
      const price = Number.parseFloat(item.price?.toString() || "0") || 0
      const quantity = Number.parseInt(item.quantity?.toString() || "0") || 0
      const itemTotal = price * quantity
      return total + (isNaN(itemTotal) ? 0 : itemTotal)
    }, 0)
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success("Copied!", `${field} copied to clipboard`)
      setTimeout(() => setCopiedField(""), 2000)
    } catch (error) {
      toast.error("Copy Failed", "Could not copy to clipboard")
    }
  }

  const subtotal = calculateSafeTotal(cart)
  const shipping = subtotal > 50000 ? 0 : 500
  const total = subtotal + shipping

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

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">Add some items to your cart before checking out.</p>
            <Button onClick={() => router.push("/products")} className="bg-orange-500 hover:bg-orange-600">
              Continue Shopping
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <section className="bg-gradient-to-br from-slate-900 via-orange-900 to-red-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Secure Checkout</h1>
            <p className="text-slate-300">Complete your order with confidence</p>
            <Badge className="mt-2 bg-green-500/20 text-green-200 border-green-300/30">
              <Lock className="w-3 h-3 mr-1" />
              Secure & Verified Orders Only
            </Badge>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/cart")}
            className="text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-8">
          <div className="space-y-6">
            {/* Authentication Required Section */}
            {checkoutMode !== "authenticated" && (
              <Card className="p-4 sm:p-6 border-2 border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Lock className="w-5 h-5 mr-2 text-orange-500" />
                    Account Required for Checkout
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    For security and order tracking, please sign in or create an account to continue
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant={checkoutMode === "login" ? "default" : "outline"}
                      onClick={() => setCheckoutMode("login")}
                      className={`h-16 flex flex-col items-center justify-center space-y-1 ${
                        checkoutMode === "login"
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "border-orange-200 hover:bg-orange-50"
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="text-xs font-medium">Sign In</span>
                    </Button>
                    <Button
                      variant={checkoutMode === "register" ? "default" : "outline"}
                      onClick={() => setCheckoutMode("register")}
                      className={`h-16 flex flex-col items-center justify-center space-y-1 ${
                        checkoutMode === "register"
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "border-orange-200 hover:bg-orange-50"
                      }`}
                    >
                      <UserPlus className="w-5 h-5" />
                      <span className="text-xs font-medium">Create Account</span>
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
                    <h4 className="font-medium text-gray-900 mb-2">Why create an account?</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Track your orders in real-time</li>
                      <li>• Faster checkout for future purchases</li>
                      <li>• Order history and easy reordering</li>
                      <li>• Exclusive offers and updates</li>
                      <li>• Better customer support</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Login Form */}
            {checkoutMode === "login" && (
              <Card className="p-4 sm:p-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <User className="w-5 h-5 mr-2 text-orange-500" />
                    Sign In to Your Account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Input
                        name="email"
                        type="email"
                        placeholder="Email address"
                        value={authInfo.email}
                        onChange={handleAuthInputChange}
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={authInfo.password}
                        onChange={handleAuthInputChange}
                        required
                        className="h-12"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                    >
                      {isAuthenticating ? "Signing in..." : "Sign In & Continue"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Button variant="ghost" onClick={() => setCheckoutMode("register")} className="text-sm">
                      Don't have an account? Create one
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Register Form */}
            {checkoutMode === "register" && (
              <Card className="p-4 sm:p-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <UserPlus className="w-5 h-5 mr-2 text-orange-500" />
                    Create Your Account
                  </CardTitle>
                  <p className="text-sm text-gray-600">Quick signup - takes less than a minute!</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Input
                        name="name"
                        type="text"
                        placeholder="Full name"
                        value={authInfo.name}
                        onChange={handleAuthInputChange}
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Input
                        name="email"
                        type="email"
                        placeholder="Email address"
                        value={authInfo.email}
                        onChange={handleAuthInputChange}
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Input
                        name="password"
                        type="password"
                        placeholder="Password (min. 6 characters)"
                        value={authInfo.password}
                        onChange={handleAuthInputChange}
                        required
                        minLength={6}
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Input
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={authInfo.confirmPassword}
                        onChange={handleAuthInputChange}
                        required
                        className="h-12"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                    >
                      {isAuthenticating ? "Creating account..." : "Create Account & Continue"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Button variant="ghost" onClick={() => setCheckoutMode("login")} className="text-sm">
                      Already have an account? Sign in
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping Information Form - Only shown when authenticated */}
            {checkoutMode === "authenticated" && (
              <Card className="p-4 sm:p-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Truck className="w-5 h-5 mr-2 text-orange-500" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="firstName"
                          value={shippingInfo.firstName}
                          onChange={handleInputChange}
                          required
                          className="h-12"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="lastName"
                          value={shippingInfo.lastName}
                          onChange={handleInputChange}
                          required
                          className="h-12"
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          name="email"
                          type="email"
                          value={shippingInfo.email}
                          onChange={handleInputChange}
                          required
                          readOnly
                          className="pl-10 h-12 bg-gray-50 cursor-not-allowed"
                          placeholder="Email address"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">From your account</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          name="phone"
                          type="tel"
                          value={shippingInfo.phone}
                          onChange={handleInputChange}
                          required
                          maxLength={11}
                          className="pl-10 h-12"
                          placeholder="09123456789"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter 11-digit Philippine mobile number (e.g., 09123456789)
                      </p>
                    </div>

                    {/* Enhanced Address Selection */}
                    <div className="space-y-4">
                      {/* Region Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Region <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCodes.regionCode}
                          onChange={handleRegionChange}
                          required
                          disabled={loadingAddress.initial}
                          className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100"
                        >
                          <option value="">{loadingAddress.initial ? "Loading regions..." : "Select region"}</option>
                          {addressData.regions.map((region) => (
                            <option key={region.code} value={region.code}>
                              {region.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Province/City Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {selectedCodes.regionCode === "130000000" ? "City" : "Province"}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCodes.provinceCode}
                          onChange={handleProvinceChange}
                          required
                          disabled={!selectedCodes.regionCode}
                          className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {!selectedCodes.regionCode
                              ? "Select region first"
                              : selectedCodes.regionCode === "130000000"
                                ? "Select city"
                                : "Select province"}
                          </option>
                          {filteredData.provinces.map((province) => (
                            <option key={province.code} value={province.code}>
                              {province.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* City Selection (for non-NCR regions) */}
                      {selectedCodes.regionCode !== "130000000" && selectedCodes.provinceCode && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City/Municipality <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedCodes.cityCode}
                            onChange={handleCityChange}
                            required
                            disabled={loadingAddress.cities || !selectedCodes.provinceCode}
                            className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {loadingAddress.cities
                                ? "Loading cities..."
                                : !selectedCodes.provinceCode
                                  ? "Select province first"
                                  : "Select city/municipality"}
                            </option>
                            {filteredData.cities.map((city) => (
                              <option key={city.code} value={city.code}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Barangay Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Barangay <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCodes.barangayCode}
                          onChange={handleBarangayChange}
                          required
                          disabled={loadingAddress.barangays || !selectedCodes.cityCode}
                          className="w-full h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {loadingAddress.barangays
                              ? "Loading barangays..."
                              : !selectedCodes.cityCode
                                ? "Select city first"
                                : "Select barangay"}
                          </option>
                          {filteredData.barangays.map((barangay) => (
                            <option key={barangay.code} value={barangay.code}>
                              {barangay.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* ZIP Code Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="zipCode"
                        value={shippingInfo.zipCode}
                        onChange={handleInputChange}
                        required
                        className="h-12"
                        placeholder="ZIP Code"
                      />
                    </div>

                    {/* Address Field - Last */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          name="address"
                          value={shippingInfo.address}
                          onChange={handleInputChange}
                          required
                          className="pl-10 h-12"
                          placeholder="House number, street name, building, apartment"
                        />
                      </div>
                    </div>

                    {/* Estimated Delivery Display */}
                    {estimatedDelivery && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-green-600 mr-2" />
                          <div>
                            <h4 className="font-semibold text-green-900">Estimated Delivery</h4>
                            <p className="text-sm text-green-700">{estimatedDelivery}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Payment Method - Only shown when authenticated */}
            {checkoutMode === "authenticated" && (
              <Card className="p-4 sm:p-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <CreditCard className="w-5 h-5 mr-2 text-orange-500" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Cash on Delivery */}
                    <label
                      className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === "cod"
                          ? "border-orange-300 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mr-3"
                      />
                      <Truck className="w-5 h-5 mr-3 text-orange-600" />
                      <div>
                        <span className="font-medium text-gray-800">Cash on Delivery</span>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </label>

                    {/* GCash */}
                    <label
                      className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === "gcash"
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="gcash"
                        checked={paymentMethod === "gcash"}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mr-3"
                      />
                      <Smartphone className="w-5 h-5 mr-3 text-blue-600" />
                      <div>
                        <span className="font-medium text-gray-800">GCash</span>
                        <p className="text-sm text-gray-600">Pay with your GCash wallet</p>
                      </div>
                    </label>

                    {/* Maya */}
                    <label
                      className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === "maya"
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="maya"
                        checked={paymentMethod === "maya"}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mr-3"
                      />
                      <Wallet className="w-5 h-5 mr-3 text-green-600" />
                      <div>
                        <span className="font-medium text-gray-800">Maya</span>
                        <p className="text-sm text-gray-600">Pay with your Maya wallet</p>
                      </div>
                    </label>

                    {/* Bank Transfer */}
                    <label
                      className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === "bank_transfer"
                          ? "border-purple-300 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="bank_transfer"
                        checked={paymentMethod === "bank_transfer"}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mr-3"
                      />
                      <Building2 className="w-5 h-5 mr-3 text-purple-600" />
                      <div>
                        <span className="font-medium text-gray-800">Bank Transfer</span>
                        <p className="text-sm text-gray-600">Direct bank transfer</p>
                      </div>
                    </label>

                    {/* GCash Payment Details */}
                    {paymentMethod === "gcash" && (
                      <div className="mt-6 p-4 rounded-lg border bg-blue-50 border-blue-200">
                        <h4 className="font-medium mb-4 text-blue-900">GCash Payment</h4>

                        {/* Shop Account Details */}
                        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-orange-200">
                          <h5 className="font-bold text-orange-800 mb-3 text-center">
                            📱 Send payment to our GCash account:
                          </h5>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Name:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{shopBankDetails.gcash.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(shopBankDetails.gcash.name, "Account Name")}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedField === "Account Name" ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Number:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{shopBankDetails.gcash.number}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(shopBankDetails.gcash.number, "Account Number")}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedField === "Account Number" ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-orange-100 rounded border border-orange-300">
                              <span className="text-sm font-medium text-orange-700">Amount to Send:</span>
                              <span className="font-bold text-xl text-orange-600">{formatPrice(total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Screenshot Upload */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload Payment Screenshot <span className="text-red-500">*</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              {!paymentDetails.paymentScreenshotFile ? (
                                <div className="text-center">
                                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                  <div className="mt-2">
                                    <label htmlFor="gcash-screenshot" className="cursor-pointer">
                                      <span className="mt-2 block text-sm font-medium text-gray-900">
                                        {isUploadingScreenshot ? "Uploading..." : "Click to upload payment screenshot"}
                                      </span>
                                      <span className="mt-1 block text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</span>
                                    </label>
                                    <input
                                      id="gcash-screenshot"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleFileUpload}
                                      disabled={isUploadingScreenshot}
                                      className="hidden"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center">
                                    <FileImage className="h-8 w-8 text-green-600 mr-3" />
                                    <div>
                                      <p className="text-sm font-medium text-green-900">
                                        {paymentDetails.paymentScreenshotFile.name}
                                      </p>
                                      <p className="text-xs text-green-600">
                                        {(paymentDetails.paymentScreenshotFile.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={removeUploadedFile}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h6 className="font-medium text-yellow-800 mb-2">Payment Instructions:</h6>
                          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                            <li>Send the exact amount ({formatPrice(total)}) to the account above</li>
                            <li>Take a screenshot of your payment confirmation</li>
                            <li>Upload the screenshot using the form above</li>
                            <li>Complete your order - we'll verify payment within 24 hours</li>
                            <li>Your order will be processed once payment is confirmed</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Maya Payment Details */}
                    {paymentMethod === "maya" && (
                      <div className="mt-6 p-4 rounded-lg border bg-green-50 border-green-200">
                        <h4 className="font-medium mb-4 text-green-900">Maya Payment</h4>

                        {/* Shop Account Details */}
                        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-orange-200">
                          <h5 className="font-bold text-orange-800 mb-3 text-center">
                            📱 Send payment to our Maya account:
                          </h5>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Name:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{shopBankDetails.maya.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(shopBankDetails.maya.name, "Maya Account Name")}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedField === "Maya Account Name" ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-600">Number:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{shopBankDetails.maya.number}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(shopBankDetails.maya.number, "Maya Account Number")}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedField === "Maya Account Number" ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-orange-100 rounded border border-orange-300">
                              <span className="text-sm font-medium text-orange-700">Amount to Send:</span>
                              <span className="font-bold text-xl text-orange-600">{formatPrice(total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Screenshot Upload */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload Payment Screenshot <span className="text-red-500">*</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              {!paymentDetails.paymentScreenshotFile ? (
                                <div className="text-center">
                                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                  <div className="mt-2">
                                    <label htmlFor="maya-screenshot" className="cursor-pointer">
                                      <span className="mt-2 block text-sm font-medium text-gray-900">
                                        {isUploadingScreenshot ? "Uploading..." : "Click to upload payment screenshot"}
                                      </span>
                                      <span className="mt-1 block text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</span>
                                    </label>
                                    <input
                                      id="maya-screenshot"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleFileUpload}
                                      disabled={isUploadingScreenshot}
                                      className="hidden"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center">
                                    <FileImage className="h-8 w-8 text-green-600 mr-3" />
                                    <div>
                                      <p className="text-sm font-medium text-green-900">
                                        {paymentDetails.paymentScreenshotFile.name}
                                      </p>
                                      <p className="text-xs text-green-600">
                                        {(paymentDetails.paymentScreenshotFile.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={removeUploadedFile}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h6 className="font-medium text-yellow-800 mb-2">Payment Instructions:</h6>
                          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                            <li>Send the exact amount ({formatPrice(total)}) to the account above</li>
                            <li>Take a screenshot of your payment confirmation</li>
                            <li>Upload the screenshot using the form above</li>
                            <li>Complete your order - we'll verify payment within 24 hours</li>
                            <li>Your order will be processed once payment is confirmed</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Payment Details */}
                    {paymentMethod === "bank_transfer" && (
                      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h4 className="font-medium text-purple-900 mb-4">Bank Transfer Payment</h4>

                        {/* Bank Account Selection */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Bank Account <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-3">
                            <label
                              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentDetails.bankAccount === "bpi"
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="bankAccount"
                                value="bpi"
                                checked={paymentDetails.bankAccount === "bpi"}
                                onChange={(e) =>
                                  setPaymentDetails({
                                    ...paymentDetails,
                                    bankAccount: e.target.value,
                                  })
                                }
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-gray-800">{shopBankDetails.bpi.bankName}</span>
                                  <Badge variant="outline" className="bg-green-100 text-green-800">
                                    Recommended
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Account: {shopBankDetails.bpi.accountNumber}
                                </div>
                              </div>
                            </label>

                            <label
                              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentDetails.bankAccount === "bdo"
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="bankAccount"
                                value="bdo"
                                checked={paymentDetails.bankAccount === "bdo"}
                                onChange={(e) =>
                                  setPaymentDetails({
                                    ...paymentDetails,
                                    bankAccount: e.target.value,
                                  })
                                }
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="font-bold text-gray-800 mb-1">{shopBankDetails.bdo.bankName}</div>
                                <div className="text-sm text-gray-600">
                                  Account: {shopBankDetails.bdo.accountNumber}
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Selected Bank Details */}
                        {paymentDetails.bankAccount && (
                          <div className="mb-4 p-4 bg-white rounded-lg border-2 border-orange-200">
                            <h5 className="font-bold text-orange-800 mb-3 text-center">🏦 Transfer to this account:</h5>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-gray-600">Bank:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    {paymentDetails.bankAccount === "bpi"
                                      ? shopBankDetails.bpi.bankName
                                      : shopBankDetails.bdo.bankName}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-gray-600">Account Name:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    {paymentDetails.bankAccount === "bpi"
                                      ? shopBankDetails.bpi.accountName
                                      : shopBankDetails.bdo.accountName}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(
                                        paymentDetails.bankAccount === "bpi"
                                          ? shopBankDetails.bpi.accountName
                                          : shopBankDetails.bdo.accountName,
                                        "Bank Account Name",
                                      )
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    {copiedField === "Bank Account Name" ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-gray-600">Account Number:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    {paymentDetails.bankAccount === "bpi"
                                      ? shopBankDetails.bpi.accountNumber
                                      : shopBankDetails.bdo.accountNumber}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(
                                        paymentDetails.bankAccount === "bpi"
                                          ? shopBankDetails.bpi.accountNumber
                                          : shopBankDetails.bdo.accountNumber,
                                        "Bank Account Number",
                                      )
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    {copiedField === "Bank Account Number" ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-2 bg-orange-100 rounded border border-orange-300">
                                <span className="text-orange-700 font-medium">Transfer Amount:</span>
                                <span className="font-bold text-xl text-orange-600">{formatPrice(total)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Payment Screenshot Upload */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload Transfer Screenshot <span className="text-red-500">*</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              {!paymentDetails.paymentScreenshotFile ? (
                                <div className="text-center">
                                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                  <div className="mt-2">
                                    <label htmlFor="bank-screenshot" className="cursor-pointer">
                                      <span className="mt-2 block text-sm font-medium text-gray-900">
                                        {isUploadingScreenshot ? "Uploading..." : "Click to upload transfer screenshot"}
                                      </span>
                                      <span className="mt-1 block text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</span>
                                    </label>
                                    <input
                                      id="bank-screenshot"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleFileUpload}
                                      disabled={isUploadingScreenshot}
                                      className="hidden"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center">
                                    <FileImage className="h-8 w-8 text-green-600 mr-3" />
                                    <div>
                                      <p className="text-sm font-medium text-green-900">
                                        {paymentDetails.paymentScreenshotFile.name}
                                      </p>
                                      <p className="text-xs text-green-600">
                                        {(paymentDetails.paymentScreenshotFile.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={removeUploadedFile}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h6 className="font-medium text-yellow-800 mb-2">Bank Transfer Instructions:</h6>
                          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                            <li>Transfer the exact amount ({formatPrice(total)}) to the selected bank account above</li>
                            <li>Keep your transfer receipt/confirmation</li>
                            <li>Take a screenshot of your transfer confirmation</li>
                            <li>Upload the screenshot using the form above</li>
                            <li>Complete your order - we'll verify payment within 24 hours</li>
                            <li>Your order will be processed once payment is confirmed</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="p-4 sm:p-6">
              <CardHeader>
                <CardTitle className="text-xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-64 sm:max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 sm:space-x-4 p-4 bg-gray-50 rounded-xl">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                        <Image
                          src={item.product.images[0] || "/placeholder.svg"}
                          alt={item.product.name}
                          fill
                          className="object-contain rounded-lg"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">{item.product.model}</p>
                        {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                          <span className="font-semibold text-orange-600">
                            {formatPrice(
                              Number.parseFloat(item.price?.toString() || "0") *
                                Number.parseInt(item.quantity?.toString() || "0"),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping Fee</span>
                    <span className={shipping === 0 ? "text-green-600 font-medium" : ""}>
                      {shipping === 0 ? "Free" : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-orange-600">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                {checkoutMode === "authenticated" && (
                  <Button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 mt-6"
                  >
                    {isProcessing ? "Processing Order..." : "Place Order"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {checkoutMode === "authenticated" && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-orange-600 mr-2" />
                  <div>
                    <h4 className="font-semibold text-orange-900">Secure Checkout</h4>
                    <p className="text-sm text-orange-700">Your information is protected with 256-bit SSL encryption</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
