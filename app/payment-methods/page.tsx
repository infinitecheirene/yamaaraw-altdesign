"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CreditCard,
  Truck,
  Smartphone,
  Wallet,
  Building2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser } from "@/lib/auth"
import type { User as UserType } from "@/lib/types"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { makeDirectLaravelRequest } from "@/lib/api-config"
import EditPaymentMethodModal from "@/components/modals/edit-payment-method-modal"

interface PaymentMethod {
  id: string
  type: "cod" | "gcash" | "maya" | "bank_transfer" | "credit_card"
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
  details?: string
}

interface SavedPaymentMethod {
  id: string
  type: "credit_card" | "gcash" | "maya" | "bank_transfer"
  name: string
  details?: string
  formatted_details: string
  is_default: boolean
  account_number?: string
  account_name?: string
  bank_name?: string
  card_number?: string
  expiry_month?: string
  expiry_year?: string
  cardholder_name?: string
  wallet_number?: string
  masked_number?: string
}

export default function PaymentMethodsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string>("cod")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SavedPaymentMethod | null>(null)

  // Available payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: "cod",
      type: "cod",
      name: "Cash on Delivery",
      description: "Pay when you receive your order",
      icon: <Truck className="w-5 h-5 text-orange-600" />,
      enabled: true,
    },
    {
      id: "gcash",
      type: "gcash",
      name: "GCash",
      description: "Pay with your GCash wallet",
      icon: <Smartphone className="w-5 h-5 text-blue-600" />,
      enabled: true,
    },
    {
      id: "maya",
      type: "maya",
      name: "Maya",
      description: "Pay with your Maya wallet",
      icon: <Wallet className="w-5 h-5 text-green-600" />,
      enabled: true,
    },
    {
      id: "bank_transfer",
      type: "bank_transfer",
      name: "Bank Transfer",
      description: "Direct bank transfer",
      icon: <Building2 className="w-5 h-5 text-purple-600" />,
      enabled: true,
    },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      const currentUser = getCurrentUser()
      setUser(currentUser)
      if (!currentUser) {
        router.push("/login")
      } else {
        fetchPaymentMethods()
      }
    }
  }, [mounted, router])

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true)
      console.log("Fetching payment methods...")

      // Use direct Laravel API call instead of Next.js API route
      const response = await makeDirectLaravelRequest("/payment-methods")
      console.log("Payment methods response:", response)

      if (response.success && response.data) {
        setSavedMethods(response.data)
        console.log("Saved methods set:", response.data)
      } else {
        console.warn("No payment methods data:", response)
        setSavedMethods([])
      }
    } catch (error: any) {
      console.error("Error fetching payment methods:", error)
      setErrorMessage(error.message || "Failed to load payment methods")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
      setSavedMethods([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId)
  }

  const handleSaveDefault = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleAddPaymentMethod = () => {
    setModalMode("add")
    setSelectedPaymentMethod(null)
    setShowModal(true)
  }

  const handleEditMethod = (method: SavedPaymentMethod) => {
    setModalMode("edit")
    setSelectedPaymentMethod(method)
    setShowModal(true)
  }

  const handleDeleteMethod = async (methodId: string) => {
    try {
      const response = await makeDirectLaravelRequest(`/payment-methods/${methodId}`, {
        method: "DELETE",
      })

      if (response.success) {
        setSavedMethods((prev) => prev.filter((method) => method.id !== methodId))
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        throw new Error(response.message || "Failed to delete payment method")
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to delete payment method")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await makeDirectLaravelRequest(`/payment-methods/${methodId}/set-default`, {
        method: "PATCH",
      })

      if (response.success) {
        // Update the local state
        setSavedMethods((prev) =>
          prev.map((method) => ({
            ...method,
            is_default: method.id === methodId,
          })),
        )
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        throw new Error(response.message || "Failed to set default payment method")
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to set default payment method")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  const handleModalSuccess = () => {
    fetchPaymentMethods() // Refresh the list
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 animate-in slide-in-from-top-2">
            <Alert className="bg-green-50 border-green-200 shadow-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Payment method updated successfully!</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Notification */}
        {showError && (
          <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 animate-in slide-in-from-top-2">
            <Alert className="bg-red-50 border-red-200 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-orange-600" />
                Payment Methods
              </h1>
              <p className="text-gray-600 mt-1">Manage your payment preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Available Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect} className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id}>
                      <div
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedMethod === method.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleMethodSelect(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} className="text-orange-600" />
                        <div className="flex items-center gap-3 flex-1">
                          {method.icon}
                          <div>
                            <Label htmlFor={method.id} className="text-base font-medium cursor-pointer">
                              {method.name}
                            </Label>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Saved Payment Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-orange-600" />
                    Saved Payment Methods ({savedMethods.length})
                  </CardTitle>
                  <Button
                    onClick={handleAddPaymentMethod}
                    size="sm"
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No saved payment methods</p>
                    <p className="text-sm">Add a payment method for faster checkout</p>
                  </div>
                ) : (
                  savedMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {method.type === "credit_card" && <CreditCard className="w-5 h-5 text-gray-600" />}
                        {method.type === "gcash" && <Smartphone className="w-5 h-5 text-blue-600" />}
                        {method.type === "maya" && <Wallet className="w-5 h-5 text-green-600" />}
                        {method.type === "bank_transfer" && <Building2 className="w-5 h-5 text-purple-600" />}
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-gray-600">{method.formatted_details}</p>
                          {method.is_default && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                              <CheckCircle className="w-3 h-3" />
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        {!method.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            className="text-xs w-full sm:w-auto"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEditMethod(method)} className="p-2">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMethod(method.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
              <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleSaveDefault}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 w-full sm:w-auto"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Save as Default
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Payment Method Modal */}
      <EditPaymentMethodModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        paymentMethod={selectedPaymentMethod}
        mode={modalMode}
      />

      <Footer />
    </>
  )
}
