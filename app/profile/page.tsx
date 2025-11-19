"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { User, Edit3, Save, X, Camera, Shield, Bell, CreditCard, Settings, LogOut, CheckCircle, AlertCircle, Upload, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser, logout, updateCurrentUser } from "@/lib/auth"
import type { User as UserType } from "@/lib/types"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { makeDirectLaravelRequest } from "@/lib/api-config"
import { useRouter } from "next/navigation"

interface ProfileData {
  name: string
  email: string
  profile_image?: string
}

interface NotificationSettings {
  orderUpdates: boolean
  promotions: boolean
  newsletter: boolean
  sms: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [activeTab, setActiveTab] = useState("profile")
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    profile_image: "",
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orderUpdates: true,
    promotions: true,
    newsletter: false,
    sms: false,
  })

  const [originalData, setOriginalData] = useState<ProfileData>({
    name: "",
    email: "",
    profile_image: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user data and notification settings
  useEffect(() => {
    if (mounted) {
      const currentUser = getCurrentUser()
      setUser(currentUser)
      if (currentUser) {
        const userData = {
          name: currentUser.name || "",
          email: currentUser.email || "",
          profile_image: currentUser.profile_image || "",
        }
        setProfileData(userData)
        setOriginalData(userData)
        // Fetch notification settings from backend
        fetchNotificationSettings()
      }
    }
  }, [mounted])

  // Fetch notification settings from backend
  const fetchNotificationSettings = async () => {
    setIsLoadingNotifications(true)
    try {
      const response = await makeDirectLaravelRequest("/profile/notifications")
      
      if (response.success && response.data) {
        // Convert snake_case to camelCase
        setNotificationSettings({
          orderUpdates: response.data.order_updates ?? true,
          promotions: response.data.promotions ?? true,
          newsletter: response.data.newsletter ?? false,
          sms: response.data.sms ?? false,
        })
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error)
      // Keep default values if fetch fails
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  // Save notification settings to backend
  const saveNotificationSettings = async (settings: NotificationSettings) => {
    setIsSavingNotifications(true)
    try {
      const response = await makeDirectLaravelRequest("/profile/notifications", {
        method: "PUT",
        body: JSON.stringify({
          order_updates: settings.orderUpdates,
          promotions: settings.promotions,
          newsletter: settings.newsletter,
          sms: settings.sms,
        }),
      })

      if (!response.success) {
        throw new Error(response.message || "Failed to update notification settings")
      }

      if (response.success) {
        // Show success message briefly
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } catch (error: any) {
      console.error("Error saving notification settings:", error)
      setErrorMessage(error.message || "Failed to update notification settings")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = async (field: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [field]: value }
    setNotificationSettings(newSettings)
    // Save to backend immediately
    await saveNotificationSettings(newSettings)
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file")
        setShowError(true)
        setTimeout(() => setShowError(false), 5000)
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image size must be less than 5MB")
        setShowError(true)
        setTimeout(() => setShowError(false), 5000)
        return
      }

      setSelectedFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setShowImageDialog(true)
    }
  }

  const handleImageUpload = async () => {
    if (!selectedFile || !user) return

    setIsUploadingImage(true)
    setShowError(false)

    try {
      const formData = new FormData()
      formData.append("profile_image", selectedFile)

      const response = await makeDirectLaravelRequest("/profile/image", {
        method: "POST",
        body: formData,
      })

      if (!response.success) {
        throw new Error(response.message || "Failed to upload image")
      }

      if (response.success && response.data) {
        const updatedUser: UserType = {
          ...user,
          profile_image: response.data.profile_image,
          updated_at: response.data.updated_at,
        }
        updateCurrentUser(updatedUser)
        setUser(updatedUser)
        setProfileData((prev) => ({ ...prev, profile_image: response.data.profile_image }))
        setOriginalData((prev) => ({ ...prev, profile_image: response.data.profile_image }))
        setShowImageDialog(false)
        setImagePreview(null)
        setSelectedFile(null)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error: any) {
      console.error("Error uploading image:", error)
      setErrorMessage(error.message || "Failed to upload image")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageRemove = async () => {
    if (!user) return

    setIsUploadingImage(true)
    setShowError(false)

    try {
      const response = await makeDirectLaravelRequest("/profile/image", {
        method: "DELETE",
      })

      if (!response.success) {
        throw new Error(response.message || "Failed to remove image")
      }

      if (response.success) {
        const updatedUser: UserType = {
          ...user,
          profile_image: "",
          updated_at: response.data?.updated_at || new Date().toISOString(),
        }
        updateCurrentUser(updatedUser)
        setUser(updatedUser)
        setProfileData((prev) => ({ ...prev, profile_image: "" }))
        setOriginalData((prev) => ({ ...prev, profile_image: "" }))
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error: any) {
      console.error("Error removing image:", error)
      setErrorMessage(error.message || "Failed to remove image")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!user) {
      setErrorMessage("User session not found")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
      return
    }

    setIsLoading(true)
    setShowError(false)

    try {
      const response = await makeDirectLaravelRequest("/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
        }),
      })

      if (!response.success) {
        throw new Error(response.message || "Failed to update profile")
      }

      if (response.success && response.data) {
        const updatedUser: UserType = {
          id: user.id,
          name: response.data.name,
          email: response.data.email,
          role: user.role,
          profile_image: user.profile_image,
          created_at: user.created_at,
          updated_at: response.data.updated_at,
        }
        updateCurrentUser(updatedUser)
        setUser(updatedUser)
        setOriginalData({
          name: response.data.name,
          email: response.data.email,
          profile_image: user.profile_image || "",
        })
        setIsEditing(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error: any) {
      console.error("Error saving profile:", error)
      setErrorMessage(error.message || "Failed to update profile")
      setShowError(true)
      setTimeout(() => setShowError(false), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setProfileData(originalData)
    setIsEditing(false)
    setShowError(false)
  }

  const handleLogout = () => {
    logout()
    window.location.href = "/login"
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Please Sign In</h2>
              <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
              <Button
                onClick={() => (window.location.href = "/login")}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    )
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
              <AlertDescription className="text-green-800">
                {isSavingNotifications ? "Notification settings updated!" : "Profile updated successfully!"}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Notification */}
        {showError && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
            <Alert className="bg-red-50 border-red-200 shadow-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Image Upload Dialog */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Profile Picture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {imagePreview && (
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="w-32 h-32">
                      <AvatarImage src={imagePreview || "/placeholder.svg"} alt="Preview" />
                      <AvatarFallback>Preview</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleImageUpload}
                  disabled={isUploadingImage || !selectedFile}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  {isUploadingImage ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImageDialog(false)
                    setImagePreview(null)
                    setSelectedFile(null)
                  }}
                  disabled={isUploadingImage}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <Card className="mb-8 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-orange-600 to-red-600 relative">
              <div className="absolute inset-0 bg-black/10"></div>
            </div>
            <CardContent className="relative px-6 pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                    <AvatarImage src={user.profile_image || "/icon512_maskable.png"} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-2xl font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Image Upload/Remove Buttons */}
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-8 h-8 p-0 rounded-full bg-white shadow-md hover:bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    {user.profile_image && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-8 h-8 p-0 rounded-full bg-white shadow-md hover:bg-red-50 hover:border-red-200"
                        onClick={handleImageRemove}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <div className="w-3 h-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                        ) : (
                          <Trash2 className="w-3 h-3 text-red-500" />
                        )}
                      </Button>
                    )}
                  </div>
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                        {user.role === "admin" && (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <Button
                          onClick={() => setIsEditing(true)}
                          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSave}
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
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                          <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-white border border-gray-200">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Information Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-600" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={!isEditing}
                      className={isEditing ? "border-orange-200 focus:border-orange-500" : ""}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={!isEditing}
                      className={isEditing ? "border-orange-200 focus:border-orange-500" : ""}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div>
                    <Label>Account Role</Label>
                    <div className="mt-1">
                      <Badge
                        className={
                          user.role === "admin" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"
                        }
                      >
                        {user.role === "admin" ? "Administrator" : "Customer"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-600" />
                    Notification Preferences
                    {isLoadingNotifications && (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="orderUpdates" className="text-base font-medium cursor-pointer">
                        Order Updates
                      </Label>
                      <p className="text-sm text-gray-600">Get notified about your order status</p>
                    </div>
                    <Switch
                      id="orderUpdates"
                      checked={notificationSettings.orderUpdates}
                      onCheckedChange={(checked) => handleNotificationChange("orderUpdates", checked)}
                      disabled={isSavingNotifications}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="promotions" className="text-base font-medium cursor-pointer">
                        Promotions & Offers
                      </Label>
                      <p className="text-sm text-gray-600">Receive special offers and discounts</p>
                    </div>
                    <Switch
                      id="promotions"
                      checked={notificationSettings.promotions}
                      onCheckedChange={(checked) => handleNotificationChange("promotions", checked)}
                      disabled={isSavingNotifications}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="newsletter" className="text-base font-medium cursor-pointer">
                        Newsletter
                      </Label>
                      <p className="text-sm text-gray-600">Weekly updates about new products</p>
                    </div>
                    <Switch
                      id="newsletter"
                      checked={notificationSettings.newsletter}
                      onCheckedChange={(checked) => handleNotificationChange("newsletter", checked)}
                      disabled={isSavingNotifications}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="sms" className="text-base font-medium cursor-pointer">
                        SMS Notifications
                      </Label>
                      <p className="text-sm text-gray-600">Receive text messages for important updates</p>
                    </div>
                    <Switch
                      id="sms"
                      checked={notificationSettings.sms}
                      onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
                      disabled={isSavingNotifications}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Account Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-600" />
                    Account Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/payment-methods")}
                    className="w-full justify-start border-orange-200 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Methods
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/privacy-settings")}
                    className="w-full justify-start border-orange-200 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Settings
                  </Button>
                  <Separator />
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 bg-transparent"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  )
}
