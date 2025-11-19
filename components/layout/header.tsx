"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, User, Menu, X, Search, Zap, Loader2, SlidersHorizontal, Download } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { getCurrentUser, logout } from "@/lib/auth"
import NotificationDropdown from "@/components/notification-dropdown"
import ToastIntegration from "@/components/toast-integration"
import type { User as UserType } from "@/lib/types"
import { getCart, getCartItemsCount } from "@/lib/cart"
import { useRouter } from "next/navigation"

interface Product {
  id: number
  name: string
  description: string
  price: number
  original_price?: number
  category: string
  model: string
  images: string[]
  ideal_for?: string[]
  colors?: string[]
  in_stock: boolean
  featured: boolean
}

interface SearchFilters {
  categories: string[]
  priceRange: [number, number]
  inStock: boolean
  featured: boolean
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileSearchQuery, setMobileSearchQuery] = useState("")
  const [cartCount, setCartCount] = useState(0)

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallButton, setShowInstallButton] = useState(false)

  // Enhanced search states
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [mobileSuggestions, setMobileSuggestions] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileLoading, setIsMobileLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    priceRange: [0, 1000000],
    inStock: false,
    featured: false,
  })
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const mobileDebounceRef = useRef<NodeJS.Timeout>()

  // PWA Install Effect
  useEffect(() => {
    const checkIfInstalled = () => {
      if (typeof window !== "undefined") {
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches
        const isInWebAppiOS = (window.navigator as any).standalone === true
        const installed = isStandalone || isInWebAppiOS
        setIsInstalled(installed)
        if (!installed) {
          setShowInstallButton(true)
        }
      }
    }

    checkIfInstalled()

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("PWA: beforeinstallprompt event fired")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!isInstalled) {
        setShowInstallButton(true)
      }
    }

    const handleAppInstalled = () => {
      console.log("PWA: App installed successfully")
      setIsInstalled(true)
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      console.log("PWA: No install prompt available")
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setShowInstallButton(false)
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } catch (error) {
      console.error("PWA: Installation failed:", error)
    }
  }

  useEffect(() => {
    if (mounted && user) {
      fetchCartCount()
    }
  }, [mounted, user])

  useEffect(() => {
    const handleCartUpdate = () => {
      if (user) {
        fetchCartCount()
      }
    }

    const handleCartCleared = () => {
      setCartCount(0)
    }

    window.addEventListener("cartUpdated", handleCartUpdate)
    window.addEventListener("cartCleared", handleCartCleared)

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate)
      window.removeEventListener("cartCleared", handleCartCleared)
    }
  }, [user])

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
    fetchCategories()
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowMobileSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchCartCount = async () => {
    try {
      const cartItems = await getCart()
      const count = getCartItemsCount(cartItems)
      setCartCount(count)
    } catch (error) {
      console.error("Error fetching cart count:", error)
      setCartCount(0)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/products")
      const data = await response.json()
      if (data.success) {
        const categories = [...new Set(data.data.map((product: Product) => product.category))] as string[]
        setAvailableCategories(categories)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchSuggestions = useCallback(async (query: string, isMobile = false) => {
    if (query.length < 2) {
      if (isMobile) {
        setMobileSuggestions([])
      } else {
        setSuggestions([])
      }
      return
    }

    if (isMobile) {
      setIsMobileLoading(true)
    } else {
      setIsLoading(true)
    }

    try {
      const params = new URLSearchParams({
        search: query,
        limit: "8",
      })
      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()

      if (data.success) {
        const results = data.data.slice(0, 8)
        if (isMobile) {
          setMobileSuggestions(results)
        } else {
          setSuggestions(results)
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      if (isMobile) {
        setMobileSuggestions([])
      } else {
        setSuggestions([])
      }
    } finally {
      if (isMobile) {
        setIsMobileLoading(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(true)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value, false)
    }, 300)
  }

  const handleMobileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMobileSearchQuery(value)
    setShowMobileSuggestions(true)

    if (mobileDebounceRef.current) {
      clearTimeout(mobileDebounceRef.current)
    }

    mobileDebounceRef.current = setTimeout(() => {
      fetchSuggestions(value, true)
    }, 300)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setUser(getCurrentUser())
    }
  }, [mounted])

  const handleLogout = () => {
    logout()
    setUser(null)
    setIsUserMenuOpen(false)
  }

  const handleSearch = (query?: string, isMobile = false) => {
    const searchTerm = query || (isMobile ? mobileSearchQuery : searchQuery)
    if (!searchTerm.trim()) return

    // Save to recent searches
    const newRecentSearches = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem("recentSearches", JSON.stringify(newRecentSearches))

    if (isMobile) {
      setShowMobileSuggestions(false)
      setIsMenuOpen(false)
    } else {
      setShowSuggestions(false)
    }

    // Build search URL with filters
    const params = new URLSearchParams({ search: searchTerm })
    if (filters.categories.length > 0) {
      params.append("categories", filters.categories.join(","))
    }
    if (filters.priceRange[0] > 0) {
      params.append("min_price", filters.priceRange[0].toString())
    }
    if (filters.priceRange[1] < 1000000) {
      params.append("max_price", filters.priceRange[1].toString())
    }
    if (filters.inStock) {
      params.append("in_stock", "true")
    }
    if (filters.featured) {
      params.append("featured", "true")
    }

    router.push(`/products?${params.toString()}`)
  }

  const handleSuggestionClick = (product: Product, isMobile = false) => {
    const newRecentSearches = [product.name, ...recentSearches.filter((s) => s !== product.name)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem("recentSearches", JSON.stringify(newRecentSearches))

    if (isMobile) {
      setMobileSearchQuery("")
      setShowMobileSuggestions(false)
      setMobileSuggestions([])
      setIsMenuOpen(false)
    } else {
      setSearchQuery("")
      setShowSuggestions(false)
      setSuggestions([])
    }

    router.push(`/products/${product.id}`)
  }

  const handleRecentSearchClick = (search: string, isMobile = false) => {
    if (isMobile) {
      setMobileSearchQuery(search)
      setShowMobileSuggestions(false)
    } else {
      setSearchQuery(search)
      setShowSuggestions(false)
    }
    handleSearch(search, isMobile)
  }

  const clearSearch = (isMobile = false) => {
    if (isMobile) {
      setMobileSearchQuery("")
      setMobileSuggestions([])
      setShowMobileSuggestions(false)
      mobileInputRef.current?.focus()
    } else {
      setSearchQuery("")
      setSuggestions([])
      setShowSuggestions(false)
      inputRef.current?.focus()
    }
  }

  const removeRecentSearch = (search: string) => {
    const newRecentSearches = recentSearches.filter((s) => s !== search)
    setRecentSearches(newRecentSearches)
    localStorage.setItem("recentSearches", JSON.stringify(newRecentSearches))
  }

  const updateFilters = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: [0, 1000000],
      inStock: false,
      featured: false,
    })
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 1000000 ||
    filters.inStock ||
    filters.featured

  return (
    <>
      <ToastIntegration />
      <header className="bg-white shadow-sm border-b sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-7">
          <div className="flex flex-row justify-between items-center h-16 sm:h-20">
            {/* Enhanced Logo */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-4 group">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/icon512_rounded.png"
                  alt="YAMAARAW Electric Vehicles Logo"
                  fill
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg sm:text-2xl lg:text-3xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent leading-tight">
                  YAMAARAW
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-medium tracking-wide hidden sm:block">
                  Electric Vehicles
                </span>
              </div>
            </Link>

            {/* Enhanced Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8   lg:mx-8" ref={searchRef}>
              <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for electric vehicles, parts, accessories..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSearch()
                      }
                      if (e.key === "Escape") {
                        setShowSuggestions(false)
                      }
                    }}
                    className="pl-12 pr-12 w-full h-12 rounded-full border-2 border-gray-200 focus:border-orange-500 bg-gray-50 focus:bg-white transition-all"
                    aria-label="Search for electric vehicles, parts, and accessories"
                    aria-describedby="search-suggestions"
                    aria-expanded={showSuggestions}
                    role="combobox"
                    aria-autocomplete="list"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearSearch(false)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                      aria-label="Clear search input"
                    >
                      <X className="w-4 h-4" />
                      <span className="sr-only">Clear search</span>
                    </Button>
                  )}
                  {isLoading && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2" role="status" aria-live="polite">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="sr-only">Searching...</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleSearch()}
                  className="h-12 px-6 rounded-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  aria-label="Search products"
                >
                  Search
                </Button>
                {/* Filters Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 px-4 rounded-full border-2 border-gray-200 hover:border-orange-500 relative"
                      aria-label={`Search filters${hasActiveFilters ? ' (active)' : ''}`}
                      aria-expanded={false}
                      aria-haspopup="dialog"
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                      {hasActiveFilters && (
                        <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-orange-600 text-white text-xs">
                          !
                        </Badge>
                      )}
                      <span className="sr-only">Search Filters</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end" role="dialog" aria-label="Search filters">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Filters</h3>
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-orange-600 hover:text-orange-700"
                            aria-label="Clear all filters"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {/* Categories */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Categories</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {availableCategories.map((category) => (
                            <div key={category} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category}`}
                                checked={filters.categories.includes(category)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateFilters("categories", [...filters.categories, category])
                                  } else {
                                    updateFilters("categories", filters.categories.filter((c) => c !== category))
                                  }
                                }}
                                aria-describedby={`category-${category}-label`}
                              />
                              <Label
                                htmlFor={`category-${category}`}
                                id={`category-${category}-label`}
                                className="text-sm cursor-pointer"
                              >
                                {category}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price Range */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Price Range: ₱{filters.priceRange[0].toLocaleString()} - ₱{filters.priceRange[1].toLocaleString()}
                        </Label>
                        <Slider
                          value={filters.priceRange}
                          onValueChange={(value) => updateFilters("priceRange", value as [number, number])}
                          max={1000000}
                          min={0}
                          step={1000}
                          className="w-full"
                          aria-label="Price range filter"
                        />
                      </div>

                      {/* Stock Status */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="in-stock"
                          checked={filters.inStock}
                          onCheckedChange={(checked) => updateFilters("inStock", checked)}
                          aria-describedby="in-stock-label"
                        />
                        <Label htmlFor="in-stock" id="in-stock-label" className="text-sm cursor-pointer">
                          In Stock Only
                        </Label>
                      </div>

                      {/* Featured */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="featured"
                          checked={filters.featured}
                          onCheckedChange={(checked) => updateFilters("featured", checked)}
                          aria-describedby="featured-label"
                        />
                        <Label htmlFor="featured" id="featured-label" className="text-sm cursor-pointer">
                          Featured Products Only
                        </Label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Desktop Search Suggestions Dropdown */}
              {showSuggestions && (searchQuery.length > 0 || recentSearches.length > 0) && (
                <Card 
                  className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg border-2 border-gray-100"
                  role="listbox"
                  id="search-suggestions"
                  aria-label="Search suggestions"
                >
                  <CardContent className="p-0">
                    {searchQuery.length === 0 && recentSearches.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Recent Searches</span>
                        </div>
                        <div className="space-y-1" role="group" aria-label="Recent searches">
                          {recentSearches.map((search, index) => (
                            <div key={index} className="flex items-center justify-between group">
                              <button
                                onClick={() => handleRecentSearchClick(search, false)}
                                className="flex-1 text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                                role="option"
                                aria-label={`Search for ${search}`}
                              >
                                <Search className="w-3 h-3 inline mr-2 text-gray-400" />
                                {search}
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRecentSearch(search)}
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                aria-label={`Remove "${search}" from recent searches`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchQuery.length > 0 && (
                      <div className="p-4">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-4" role="status" aria-live="polite">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500">Searching...</span>
                          </div>
                        ) : suggestions.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-600">Products</span>
                              <span className="text-xs text-gray-500">{suggestions.length} found</span>
                            </div>
                            <div role="group" aria-label="Product suggestions">
                              {suggestions.map((product) => (
                                <button
                                  key={product.id}
                                  onClick={() => handleSuggestionClick(product, false)}
                                  className="w-full flex items-center space-x-3 p-3 hover:bg-orange-50 rounded-lg text-left transition-colors border border-transparent hover:border-orange-200"
                                  role="option"
                                  aria-label={`${product.name} - ${product.category} - ₱${product.price.toLocaleString()}`}
                                >
                                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                                    {product.images && product.images.length > 0 ? (
                                      <Image
                                        src={product.images[0] || "/placeholder.svg"}
                                        alt={product.name}
                                        width={56}
                                        height={56}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <Search className="w-5 h-5 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 truncate text-base">{product.name}</div>
                                    <div className="text-sm text-gray-600 truncate">
                                      {product.category} • {product.model}
                                    </div>
                                    <div className="text-lg font-bold text-orange-600 mt-1">
                                      ₱{product.price.toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-1">
                                    {product.featured && (
                                      <Badge className="bg-yellow-500 text-white text-xs font-medium">Featured</Badge>
                                    )}
                                    <Badge
                                      className={`text-xs font-medium ${
                                        product.in_stock ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                      }`}
                                    >
                                      {product.in_stock ? "In Stock" : "Out of Stock"}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <Separator />
                            <button
                              onClick={() => handleSearch()}
                              className="w-full text-left px-3 py-3 text-sm text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                              aria-label={`View all search results for "${searchQuery}"`}
                            >
                              <Search className="w-4 h-4 inline mr-2" />
                              View all results for "{searchQuery}"
                            </button>
                          </div>
                        ) : searchQuery.length >= 2 ? (
                          <div className="py-8 text-center">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <div className="text-sm text-gray-600 mb-3">No products found for "{searchQuery}"</div>
                            <button
                              onClick={() => handleSearch()}
                              className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                              aria-label={`Search anyway for "${searchQuery}"`}
                            >
                              Search anyway
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 mx-5" role="navigation" aria-label="Main navigation">
              <Link
                href="/products"
                className="text-gray-700 hover:text-orange-600 font-medium transition-colors relative group"
              >
                Products
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-600 to-red-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-orange-600 font-medium transition-colors relative group"
              >
                About Us
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-600 to-red-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-orange-600 font-medium transition-colors relative group"
              >
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-600 to-red-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center ml-5">
              <Link href="/cart" className="mr-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative p-2 rounded-full hover:bg-orange-50 transition-all duration-300 group"
                  data-cart-icon
                  aria-label={`Shopping cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5 text-orange-600 group-hover:text-orange-700 transition-colors" />
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300">
                      <Zap className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                  {mounted && cartCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold animate-pulse"
                      aria-label={`${cartCount} items in cart`}
                      role="status"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </Badge>
                  )}
                  <span className="sr-only">Shopping Cart</span>
                </Button>
              </Link>

              {mounted && showInstallButton && !isInstalled && (
                <Button
                  onClick={handleInstallApp}
                  variant="ghost"
                  size="sm"
                  className="p-2 rounded-full hover:bg-purple-50 transition-all duration-300 group mr-1"
                  title="Install YAMAARAW App"
                  aria-label="Install YAMAARAW mobile app"
                >
                  <Download className="w-5 h-5 text-purple-600 group-hover:text-purple-700 group-hover:scale-110 transition-all" />
                  <span className="sr-only">Install App</span>
                </Button>
              )}

              {mounted && user && (
                <div className="mr-1">
                  <NotificationDropdown />
                </div>
              )}

              <div className="relative hidden lg:block mr-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 rounded-full hover:bg-orange-50 group"
                  aria-label={mounted && user ? `User menu for ${user.name}` : "User menu - Sign in"}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                >
                  {mounted && user ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <User className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                  )}
                  <span className="sr-only">User Menu</span>
                </Button>
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100"
                    role="menu"
                    aria-labelledby="user-menu-button"
                  >
                    {mounted && user ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                          role="menuitem"
                        >
                          My Profile
                        </Link>
                        <Link
                          href="/orders"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                          role="menuitem"
                        >
                          My Orders
                        </Link>
                        {user.role === "admin" && (
                          <Link
                            href="/admin"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                            role="menuitem"
                          >
                            Admin Panel
                          </Link>
                        )}
                        <hr className="my-2" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          role="menuitem"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                          role="menuitem"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/register"
                          className="block px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors font-medium"
                          onClick={() => setIsUserMenuOpen(false)}
                          role="menuitem"
                        >
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-full hover:bg-orange-50 group"
                aria-label={isMenuOpen ? "Close mobile menu" : "Open mobile menu"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                )}
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </div>
          </div>

          {/* Enhanced Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-100" id="mobile-menu">
              <div className="px-4 py-3 space-y-4">
                {/* Enhanced Mobile Search */}
                <div className="relative" ref={mobileSearchRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        ref={mobileInputRef}
                        type="text"
                        placeholder="Search electric vehicles..."
                        value={mobileSearchQuery}
                        onChange={handleMobileInputChange}
                        onFocus={() => setShowMobileSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleSearch(undefined, true)
                          }
                          if (e.key === "Escape") {
                            setShowMobileSuggestions(false)
                          }
                        }}
                        className="pl-10 pr-10 w-full rounded-full border-2 border-gray-200 focus:border-orange-500 h-10"
                        aria-label="Search for electric vehicles"
                        aria-describedby="mobile-search-suggestions"
                        aria-expanded={showMobileSuggestions}
                        role="combobox"
                        aria-autocomplete="list"
                      />
                      {mobileSearchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => clearSearch(true)}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                          aria-label="Clear mobile search input"
                        >
                          <X className="w-3 h-3" />
                          <span className="sr-only">Clear search</span>
                        </Button>
                      )}
                      {isMobileLoading && (
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2" role="status" aria-live="polite">
                          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                          <span className="sr-only">Searching...</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleSearch(undefined, true)}
                      className="h-10 px-4 rounded-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      aria-label="Search products on mobile"
                    >
                      Search
                    </Button>
                  </div>

                  {/* Mobile Filters */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-2 h-10 rounded-full border-2 border-gray-200 hover:border-orange-500 relative"
                        aria-label={`Mobile search filters${hasActiveFilters ? ' (active)' : ''}`}
                        aria-expanded={false}
                        aria-haspopup="dialog"
                      >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Filters
                        {hasActiveFilters && (
                          <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-orange-600 text-white text-xs">
                            !
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="center" role="dialog" aria-label="Mobile search filters">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">Filters</h3>
                          {hasActiveFilters && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearFilters}
                              className="text-orange-600 hover:text-orange-700"
                              aria-label="Clear all mobile filters"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>

                        {/* Categories */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Categories</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {availableCategories.map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`mobile-category-${category}`}
                                  checked={filters.categories.includes(category)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      updateFilters("categories", [...filters.categories, category])
                                    } else {
                                      updateFilters("categories", filters.categories.filter((c) => c !== category))
                                    }
                                  }}
                                  aria-describedby={`mobile-category-${category}-label`}
                                />
                                <Label
                                  htmlFor={`mobile-category-${category}`}
                                  id={`mobile-category-${category}-label`}
                                  className="text-sm cursor-pointer"
                                >
                                  {category}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Price Range: ₱{filters.priceRange[0].toLocaleString()} - ₱{filters.priceRange[1].toLocaleString()}
                          </Label>
                          <Slider
                            value={filters.priceRange}
                            onValueChange={(value) => updateFilters("priceRange", value as [number, number])}
                            max={1000000}
                            min={0}
                            step={1000}
                            className="w-full"
                            aria-label="Mobile price range filter"
                          />
                        </div>

                        {/* Stock Status */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="mobile-in-stock"
                            checked={filters.inStock}
                            onCheckedChange={(checked) => updateFilters("inStock", checked)}
                            aria-describedby="mobile-in-stock-label"
                          />
                          <Label htmlFor="mobile-in-stock" id="mobile-in-stock-label" className="text-sm cursor-pointer">
                            In Stock Only
                          </Label>
                        </div>

                        {/* Featured */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="mobile-featured"
                            checked={filters.featured}
                            onCheckedChange={(checked) => updateFilters("featured", checked)}
                            aria-describedby="mobile-featured-label"
                          />
                          <Label htmlFor="mobile-featured" id="mobile-featured-label" className="text-sm cursor-pointer">
                            Featured Products Only
                          </Label>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Mobile Search Suggestions */}
                  {showMobileSuggestions && (mobileSearchQuery.length > 0 || recentSearches.length > 0) && (
                    <Card 
                      className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg border-2 border-gray-100 max-h-80 overflow-y-auto"
                      role="listbox"
                      id="mobile-search-suggestions"
                      aria-label="Mobile search suggestions"
                    >
                      <CardContent className="p-0">
                        {mobileSearchQuery.length === 0 && recentSearches.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600">Recent Searches</span>
                            </div>
                            <div className="space-y-1" role="group" aria-label="Recent mobile searches">
                              {recentSearches.map((search, index) => (
                                <div key={index} className="flex items-center justify-between group">
                                  <button
                                    onClick={() => handleRecentSearchClick(search, true)}
                                    className="flex-1 text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                                    role="option"
                                    aria-label={`Search for ${search} on mobile`}
                                  >
                                    <Search className="w-3 h-3 inline mr-2 text-gray-400" />
                                    {search}
                                  </button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRecentSearch(search)}
                                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                    aria-label={`Remove "${search}" from recent mobile searches`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {mobileSearchQuery.length > 0 && (
                          <div className="p-3">
                            {isMobileLoading ? (
                              <div className="flex items-center justify-center py-4" role="status" aria-live="polite">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                <span className="ml-2 text-sm text-gray-500">Searching...</span>
                              </div>
                            ) : mobileSuggestions.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-600">Products</span>
                                  <span className="text-xs text-gray-500">{mobileSuggestions.length} found</span>
                                </div>
                                <div role="group" aria-label="Mobile product suggestions">
                                  {mobileSuggestions.map((product) => (
                                    <button
                                      key={product.id}
                                      onClick={() => handleSuggestionClick(product, true)}
                                      className="w-full flex items-center space-x-2 p-2 hover:bg-orange-50 rounded-lg text-left transition-colors border border-transparent hover:border-orange-200"
                                      role="option"
                                      aria-label={`${product.name} - ${product.category} - ₱${product.price.toLocaleString()}`}
                                    >
                                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                                        {product.images && product.images.length > 0 ? (
                                          <Image
                                            src={product.images[0] || "/placeholder.svg"}
                                            alt={product.name}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <Search className="w-3 h-3 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate text-sm">{product.name}</div>
                                        <div className="text-xs text-gray-600 truncate">
                                          {product.category} • ₱{product.price.toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end space-y-1">
                                        {product.featured && (
                                          <Badge className="bg-yellow-500 text-white text-xs">Featured</Badge>
                                        )}
                                        <Badge
                                          className={`text-xs ${
                                            product.in_stock ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                          }`}
                                        >
                                          {product.in_stock ? "In Stock" : "Out of Stock"}
                                        </Badge>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                <Separator />
                                <button
                                  onClick={() => handleSearch(undefined, true)}
                                  className="w-full text-left px-2 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                                  aria-label={`View all mobile search results for "${mobileSearchQuery}"`}
                                >
                                  <Search className="w-3 h-3 inline mr-2" />
                                  View all results for "{mobileSearchQuery}"
                                </button>
                              </div>
                            ) : mobileSearchQuery.length >= 2 ? (
                              <div className="py-6 text-center">
                                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <div className="text-sm text-gray-600 mb-2">
                                  No products found for "{mobileSearchQuery}"
                                </div>
                                <button
                                  onClick={() => handleSearch(undefined, true)}
                                  className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                                  aria-label={`Search anyway for "${mobileSearchQuery}" on mobile`}
                                >
                                  Search anyway
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Navigation Links */}
                <div className="space-y-2 pt-2" role="navigation" aria-label="Mobile navigation">
                  <Link
                    href="/products"
                    className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Products
                  </Link>
                  <Link
                    href="/about"
                    className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link
                    href="/contact"
                    className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </div>

                {/* User Menu in Mobile */}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  {mounted && user ? (
                    <>
                      <div className="flex items-center space-x-3 px-2 py-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/orders"
                        className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleLogout()
                          setIsMenuOpen(false)
                        }}
                        className="block w-full text-left text-red-600 hover:text-red-700 font-medium py-2 transition-colors"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="block text-gray-700 hover:text-orange-600 font-medium py-2 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="block text-orange-600 hover:text-orange-700 font-semibold py-2 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
