"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Package, Truck, Tag, RefreshCw, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/contexts/notification-context"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useNotifications()

  useEffect(() => {
    setMounted(true)
    setUser(getCurrentUser())
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Check if content is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollContainerRef.current
        const isScrollable = scrollHeight > clientHeight
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5
        setShowScrollIndicator(isScrollable && !isAtBottom)
      }
    }

    if (isOpen && notifications.length > 0) {
      // Check after a short delay to ensure content is rendered
      setTimeout(checkScrollable, 100)

      const scrollContainer = scrollContainerRef.current
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", checkScrollable)
        return () => scrollContainer.removeEventListener("scroll", checkScrollable)
      }
    }
  }, [isOpen, notifications.length])

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
      case "order_status":
        return <Package className="w-4 h-4 text-blue-500" />
      case "shipping":
        return <Truck className="w-4 h-4 text-orange-500" />
      case "promotion":
        return <Tag className="w-4 h-4 text-green-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Don't render if user is not logged in or not mounted
  if (!mounted || !user) {
    return null
  }

  // Calculate dynamic max height based on screen size
  const getMaxHeight = () => {
    if (typeof window !== "undefined") {
      const screenHeight = window.innerHeight
      const maxHeight = Math.min(screenHeight * 0.6, 500) // 60% of screen or 500px max
      return `${maxHeight}px`
    }
    return "400px"
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="relative p-2 rounded-full hover:bg-orange-50 transition-colors"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
          if (!isOpen) {
            refreshNotifications()
          }
        }}
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && mounted && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden" />

          {/* Dropdown Panel */}
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
            style={{
              maxHeight: "calc(100vh - 100px)",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    refreshNotifications()
                  }}
                  disabled={loading}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      markAllNotificationsAsRead()
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 h-8"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                  }}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content with improved scrolling */}
            <div className="relative">
              <div
                ref={scrollContainerRef}
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
                style={{
                  maxHeight: getMaxHeight(),
                }}
              >
                {loading && notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">We'll notify you about your orders here</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification, index) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group ${
                          !notification.read_at ? "bg-blue-50" : ""
                        } ${index !== notifications.length - 1 ? "border-b border-gray-100" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!notification.read_at) {
                            markNotificationAsRead(notification.id)
                          }
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p
                                className={`text-sm font-medium leading-tight ${
                                  !notification.read_at ? "text-gray-900" : "text-gray-700"
                                }`}
                              >
                                {notification.title}
                              </p>
                              {!notification.read_at && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1 leading-relaxed ${
                                !notification.read_at ? "text-gray-600" : "text-gray-500"
                              }`}
                            >
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scroll indicator */}
              {showScrollIndicator && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-1">
                  <ChevronDown className="w-4 h-4 text-gray-400 animate-bounce" />
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 sticky bottom-0">
                
              </div>
            )}
          </div>
        </>
      )}

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 4px;
        }
        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background-color: #f3f4f6;
        }
        .hover\\:scrollbar-thumb-gray-400:hover::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
      `}</style>
    </div>
  )
}
