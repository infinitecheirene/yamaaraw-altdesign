"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { CreditCard, Smartphone, Wallet, Building2, Save, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { makeDirectLaravelRequest } from "@/lib/api-config"

interface SavedPaymentMethod {
  id: string
  type: "credit_card" | "gcash" | "maya" | "bank_transfer" // Keep credit_card for existing data
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
}

interface EditPaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  paymentMethod?: SavedPaymentMethod | null
  mode: "add" | "edit"
}

interface FormData {
  type: "credit_card" | "gcash" | "maya" | "bank_transfer" // Keep for existing data
  name: string
  is_default: boolean
  // Credit card fields
  card_number?: string
  cardholder_name?: string
  expiry_month?: string
  expiry_year?: string
  // Bank transfer fields
  bank_name?: string
  account_number?: string
  account_name?: string
  // Wallet fields
  wallet_number?: string
}

export default function EditPaymentMethodModal({
  isOpen,
  onClose,
  onSuccess,
  paymentMethod,
  mode,
}: EditPaymentMethodModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<FormData>({
    type: "gcash", // Change from "credit_card" to "gcash"
    name: "",
    is_default: false,
  })

  // Helper function to convert Laravel errors to single string errors
  const processLaravelErrors = (laravelErrors: Record<string, string[]>): Record<string, string> => {
    const processedErrors: Record<string, string> = {}

    Object.keys(laravelErrors).forEach((key) => {
      // Take the first error message for each field
      processedErrors[key] = laravelErrors[key][0] || ""
    })

    return processedErrors
  }

  // Reset form when modal opens/closes or payment method changes
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && paymentMethod) {
        setFormData({
          type: paymentMethod.type,
          name: paymentMethod.name,
          is_default: paymentMethod.is_default,
          card_number: paymentMethod.card_number || "",
          cardholder_name: paymentMethod.cardholder_name || "",
          expiry_month: paymentMethod.expiry_month || "",
          expiry_year: paymentMethod.expiry_year || "",
          bank_name: paymentMethod.bank_name || "",
          account_number: paymentMethod.account_number || "",
          account_name: paymentMethod.account_name || "",
          wallet_number: paymentMethod.wallet_number || "",
        })
      } else {
        setFormData({
          type: "gcash", // Default to gcash for new payments
          name: "",
          is_default: false,
        })
      }
      setErrors({})
    }
  }, [isOpen, mode, paymentMethod])

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    switch (formData.type) {
      case "credit_card":
        if (!formData.card_number?.trim()) {
          newErrors.card_number = "Card number is required"
        } else if (formData.card_number.replace(/\s/g, "").length < 13) {
          newErrors.card_number = "Card number must be at least 13 digits"
        }
        if (!formData.cardholder_name?.trim()) {
          newErrors.cardholder_name = "Cardholder name is required"
        }
        if (!formData.expiry_month) {
          newErrors.expiry_month = "Expiry month is required"
        }
        if (!formData.expiry_year) {
          newErrors.expiry_year = "Expiry year is required"
        }
        break
      case "bank_transfer":
        if (!formData.bank_name?.trim()) {
          newErrors.bank_name = "Bank name is required"
        }
        if (!formData.account_number?.trim()) {
          newErrors.account_number = "Account number is required"
        }
        if (!formData.account_name?.trim()) {
          newErrors.account_name = "Account name is required"
        }
        break
      case "gcash":
      case "maya":
        if (!formData.wallet_number?.trim()) {
          newErrors.wallet_number = "Wallet number is required"
        } else if (formData.wallet_number.length < 11) {
          newErrors.wallet_number = "Please enter a valid mobile number"
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const endpoint = mode === "edit" ? `/payment-methods/${paymentMethod?.id}` : "/payment-methods"
      const method = mode === "edit" ? "PUT" : "POST"

      const response = await makeDirectLaravelRequest(endpoint, {
        method,
        body: JSON.stringify(formData),
      })

      if (response.success) {
        onSuccess()
        onClose()
      } else {
        if (response.errors) {
          // Process Laravel validation errors
          const processedErrors = processLaravelErrors(response.errors)
          setErrors(processedErrors)
        } else {
          setErrors({ general: response.message || "Failed to save payment method" })
        }
      }
    } catch (error: any) {
      console.error("Payment method save error:", error)
      setErrors({ general: error.message || "Failed to save payment method" })
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "gcash":
        return <Smartphone className="w-5 h-5" />
      case "maya":
        return <Wallet className="w-5 h-5" />
      case "bank_transfer":
        return <Building2 className="w-5 h-5" />
      default:
        return <Smartphone className="w-5 h-5" />
    }
  }

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case "credit_card":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="card_number">Card Number</Label>
              <Input
                id="card_number"
                value={formData.card_number || ""}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/\s/g, "")
                    .replace(/(.{4})/g, "$1 ")
                    .trim()
                  handleInputChange("card_number", value)
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className={errors.card_number ? "border-red-500" : ""}
                disabled={true} // Disable editing for existing credit cards
              />
              {errors.card_number && <p className="text-sm text-red-500">{errors.card_number}</p>}
              <p className="text-xs text-gray-500">Credit card details cannot be modified</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholder_name">Cardholder Name</Label>
              <Input
                id="cardholder_name"
                value={formData.cardholder_name || ""}
                onChange={(e) => handleInputChange("cardholder_name", e.target.value)}
                placeholder="John Doe"
                className={errors.cardholder_name ? "border-red-500" : ""}
                disabled={true} // Disable editing for existing credit cards
              />
              {errors.cardholder_name && <p className="text-sm text-red-500">{errors.cardholder_name}</p>}
            </div>
          </>
        )
    case "bank_transfer":
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              value={formData.bank_name || ""}
              onChange={(e) => handleInputChange("bank_name", e.target.value)}
              placeholder="BPI, BDO, Metrobank, etc."
              className={errors.bank_name ? "border-red-500" : ""}
            />
            {errors.bank_name && <p className="text-sm text-red-500">{errors.bank_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Account Number</Label>
            <Input
              id="account_number"
              value={formData.account_number || ""}
              onChange={(e) => handleInputChange("account_number", e.target.value)}
              placeholder="1234567890"
              className={errors.account_number ? "border-red-500" : ""}
            />
            {errors.account_number && <p className="text-sm text-red-500">{errors.account_number}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              value={formData.account_name || ""}
              onChange={(e) => handleInputChange("account_name", e.target.value)}
              placeholder="John Doe"
              className={errors.account_name ? "border-red-500" : ""}
            />
            {errors.account_name && <p className="text-sm text-red-500">{errors.account_name}</p>}
          </div>
        </>
      )
    case "gcash":
    case "maya":
      return (
        <div className="space-y-2">
          <Label htmlFor="wallet_number">Mobile Number</Label>
          <Input
            id="wallet_number"
            value={formData.wallet_number || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "")
              handleInputChange("wallet_number", value)
            }}
            placeholder="09123456789"
            maxLength={11}
            className={errors.wallet_number ? "border-red-500" : ""}
          />
          {errors.wallet_number && <p className="text-sm text-red-500">{errors.wallet_number}</p>}
        </div>
      )
    default:
      return null
  }
}

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "add" ? <Plus className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            {mode === "add" ? "Add Payment Method" : "Edit Payment Method"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Payment Method Type */}
          {mode === "add" && (
            <div className="space-y-3">
              <Label>Payment Method Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => handleInputChange("type", value as FormData["type"])}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 min-h-[48px]">
                  <RadioGroupItem value="gcash" id="gcash" />
                  <Label htmlFor="gcash" className="flex items-center gap-2 cursor-pointer">
                    <Smartphone className="w-4 h-4" />
                    GCash
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 min-h-[48px]">
                  <RadioGroupItem value="maya" id="maya" />
                  <Label htmlFor="maya" className="flex items-center gap-2 cursor-pointer">
                    <Wallet className="w-4 h-4" />
                    Maya
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 min-h-[48px] sm:col-span-2">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                  <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-4 h-4" />
                    Bank Transfer
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="My Primary Card"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Type-specific fields */}
          {renderTypeSpecificFields()}

          {/* Set as Default */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_default" className="text-base font-medium">
              Set as default payment method
            </Label>
            <Switch
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => handleInputChange("is_default", checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:flex-1 bg-transparent"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === "add" ? "Add Method" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
