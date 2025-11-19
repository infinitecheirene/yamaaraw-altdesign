"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Shield,
  Lock,
  Globe,
  UserCheck,
  Database,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCurrentUser } from "@/lib/auth"
import type { User as UserType } from "@/lib/types"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { makeAuthenticatedRequest } from "@/lib/api"

interface PrivacySettings {
  profileVisibility: "public" | "private" | "friends"
  showEmail: boolean
  showPhone: boolean
  allowDataCollection: boolean
  allowMarketing: boolean
  allowCookies: boolean
  twoFactorAuth: boolean
  loginNotifications: boolean
  dataDownload: boolean
  accountDeletion: boolean
}

export default function PrivacySettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: "public",
    showEmail: false,
    showPhone: false,
    allowDataCollection: true,
    allowMarketing: false,
    allowCookies: true,
    twoFactorAuth: false,
    loginNotifications: true,
    dataDownload: true,
    accountDeletion: true,
  })

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
        fetchPrivacySettings()
      }
    }
  }, [mounted, router])

  const fetchPrivacySettings = async () => {
    try {
      setIsLoadingData(true)
      const response = await makeAuthenticatedRequest<any>("/api/privacy-settings")
      if (response.success && response.data) {
        // Map Laravel snake_case to camelCase
        setPrivacySettings({
          profileVisibility: response.data.profile_visibility,
          showEmail: response.data.show_email,
          showPhone: response.data.show_phone,
          allowDataCollection: response.data.allow_data_collection,
          allowMarketing: response.data.allow_marketing,
          allowCookies: response.data.allow_cookies,
          twoFactorAuth: response.data.two_factor_auth,
          loginNotifications: response.data.login_notifications,
          dataDownload: response.data.data_download,
          accountDeletion: response.data.account_deletion,
        })
      } else {
        throw new Error(response.message || "Failed to fetch privacy settings")
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load privacy settings")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSettingChange = (key: keyof PrivacySettings, value: boolean | string) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    setShowError(false)
    try {
      // Convert camelCase to snake_case for Laravel API
      const settingsPayload = {
        profile_visibility: privacySettings.profileVisibility,
        show_email: privacySettings.showEmail,
        show_phone: privacySettings.showPhone,
        allow_data_collection: privacySettings.allowDataCollection,
        allow_marketing: privacySettings.allowMarketing,
        allow_cookies: privacySettings.allowCookies,
        two_factor_auth: privacySettings.twoFactorAuth,
        login_notifications: privacySettings.loginNotifications,
        data_download: privacySettings.dataDownload,
        account_deletion: privacySettings.accountDeletion,
      }

      const response = await makeAuthenticatedRequest("/api/privacy-settings", {
        method: "PUT",
        body: JSON.stringify(settingsPayload),
      })

      if (response.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        throw new Error(response.message || "Failed to save privacy settings")
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to save privacy settings")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDataDownload = async () => {
    try {
      const response = await makeAuthenticatedRequest("/api/privacy-settings/export")
      if (response.success && response.data) {
        const dataStr = JSON.stringify(response.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: "application/json" })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `yamaaraw-data-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        throw new Error(response.message || "Failed to export data")
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to download data")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    }
  }

  if (!mounted || isLoadingData) {
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
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
            <Alert className="bg-green-50 border-green-200 shadow-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Privacy settings updated successfully!</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Notification */}
        {showError && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
            <Alert className="bg-red-50 border-red-200 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-orange-600" />
                Privacy Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your privacy and data preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                  Profile Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Profile Visibility</Label>
                    <p className="text-sm text-gray-600">Control who can see your profile information</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={privacySettings.profileVisibility === "public" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSettingChange("profileVisibility", "public")}
                      className={
                        privacySettings.profileVisibility === "public"
                          ? "bg-gradient-to-r from-orange-600 to-red-600"
                          : ""
                      }
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Public
                    </Button>
                    <Button
                      variant={privacySettings.profileVisibility === "private" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSettingChange("profileVisibility", "private")}
                      className={
                        privacySettings.profileVisibility === "private"
                          ? "bg-gradient-to-r from-orange-600 to-red-600"
                          : ""
                      }
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      Private
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="showEmail"
                      checked={privacySettings.showEmail}
                      onCheckedChange={(checked) => handleSettingChange("showEmail", checked)}
                    />
                    <div>
                      <Label htmlFor="showEmail" className="text-base font-medium cursor-pointer">
                        Show Email Address
                      </Label>
                      <p className="text-sm text-gray-600">Allow others to see your email address</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="showPhone"
                      checked={privacySettings.showPhone}
                      onCheckedChange={(checked) => handleSettingChange("showPhone", checked)}
                    />
                    <div>
                      <Label htmlFor="showPhone" className="text-base font-medium cursor-pointer">
                        Show Phone Number
                      </Label>
                      <p className="text-sm text-gray-600">Allow others to see your phone number</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-600" />
                  Data & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="allowDataCollection"
                      checked={privacySettings.allowDataCollection}
                      onCheckedChange={(checked) => handleSettingChange("allowDataCollection", checked)}
                    />
                    <div>
                      <Label htmlFor="allowDataCollection" className="text-base font-medium cursor-pointer">
                        Data Collection
                      </Label>
                      <p className="text-sm text-gray-600">Allow us to collect usage data to improve our services</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="allowMarketing"
                      checked={privacySettings.allowMarketing}
                      onCheckedChange={(checked) => handleSettingChange("allowMarketing", checked)}
                    />
                    <div>
                      <Label htmlFor="allowMarketing" className="text-base font-medium cursor-pointer">
                        Marketing Analytics
                      </Label>
                      <p className="text-sm text-gray-600">
                        Allow us to track your preferences for personalized offers
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="allowCookies"
                      checked={privacySettings.allowCookies}
                      onCheckedChange={(checked) => handleSettingChange("allowCookies", checked)}
                    />
                    <div>
                      <Label htmlFor="allowCookies" className="text-base font-medium cursor-pointer">
                        Cookie Preferences
                      </Label>
                      <p className="text-sm text-gray-600">Allow us to use cookies for better user experience</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
          

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-6">
              <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
