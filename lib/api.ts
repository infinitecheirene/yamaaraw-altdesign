// Core interfaces
interface RequestOptions extends RequestInit {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: string | FormData
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  total?: number
  message?: string
  errors?: Record<string, string[]>
}

// Product-related interfaces
export interface ProductData {
  id?: number
  name: string
  description: string
  price: number
  original_price?: number
  category: string
  model: string
  specifications?: any
  ideal_for?: string[]
  colors?: Array<{ name: string; value: string }>
  in_stock: boolean
  featured: boolean
  images?: string[]
}

export interface ProductFilters {
  search?: string
  category?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  sort_by?: string
  sort_order?: string
}

interface GetProductsParams {
  search?: string
  category?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  sort_by?: string
  sort_order?: "asc" | "desc"
}

// Utility functions
function getAuthToken(): string | null {
  try {
    if (typeof window === "undefined") return null
    const sessionData = localStorage.getItem("session")
    if (!sessionData) return null
    const session = JSON.parse(sessionData)
    return session.token || null
  } catch (error) {
    console.error("Error getting auth token:", error)
    return null
  }
}

export async function makeAuthenticatedRequest<T = any>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken()
    if (!token) {
      throw new Error("Authentication required")
    }

    const isFormData = options.body instanceof FormData
    const defaultHeaders: HeadersInit = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }

    // Don't set Content-Type for FormData, let the browser set it
    if (!isFormData && options.method !== "GET") {
      defaultHeaders["Content-Type"] = "application/json"
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    const response = await fetch(url, config)

    // Handle different response types
    const contentType = response.headers.get("content-type")
    let data: any

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text()
      data = text ? JSON.parse(text) : {}
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    // Ensure we return a consistent ApiResponse structure
    if (typeof data === "object" && data !== null && "success" in data) {
      return data as ApiResponse<T>
    }

    // Wrap non-standard responses
    return {
      success: true,
      data: data as T,
    }
  } catch (error: any) {
    console.error("API request failed:", error)
    return {
      success: false,
      message: error.message || "Request failed",
    }
  }
}

// Main ProductApi class
class ProductApi {
  private baseUrl = "/api/products"

  private getAuthHeaders(): HeadersInit {
    const token = getAuthToken()
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any
      try {
        const errorText = await response.text()
        errorData = errorText ? JSON.parse(errorText) : { message: `HTTP error! status: ${response.status}` }
      } catch {
        errorData = { message: `HTTP error! status: ${response.status}` }
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const responseText = await response.text()
    if (!responseText) {
      return { success: true, message: "Operation completed successfully" } as any
    }

    try {
      const data = JSON.parse(responseText)
      // Handle Laravel API response structure
      if (data.success && data.data) {
        return data.data
      }
      return data.data || data
    } catch {
      return { success: true, message: "Operation completed successfully" } as any
    }
  }

  async getProducts(params?: GetProductsParams): Promise<ProductData[]> {
    try {
      const searchParams = new URLSearchParams()

      if (params?.search) searchParams.append("search", params.search)
      if (params?.category) searchParams.append("category", params.category)
      if (params?.min_price !== undefined) searchParams.append("min_price", params.min_price.toString())
      if (params?.max_price !== undefined) searchParams.append("max_price", params.max_price.toString())
      if (params?.in_stock !== undefined) searchParams.append("in_stock", params.in_stock.toString())
      if (params?.sort_by) searchParams.append("sort_by", params.sort_by)
      if (params?.sort_order) searchParams.append("sort_order", params.sort_order)

      const url = `${this.baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      console.log("Fetching products from:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      const data = await this.handleResponse<ProductData[] | ApiResponse<ProductData[]>>(response)

      // Handle both direct array response and Laravel API response structure
      if (Array.isArray(data)) {
        return data
      }

      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error("Error fetching products:", error)
      throw error
    }
  }

  async getFeaturedProducts(): Promise<ProductData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/featured`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      const data = await this.handleResponse<ProductData[]>(response)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error("Error fetching featured products:", error)
      throw error
    }
  }

  async getProductsByCategory(
    category: string,
    additionalParams?: Omit<GetProductsParams, "category">,
  ): Promise<ProductData[]> {
    return this.getProducts({
      category,
      ...additionalParams,
    })
  }

  async getProduct(id: number): Promise<ProductData> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      return await this.handleResponse<ProductData>(response)
    } catch (error) {
      console.error("Error fetching product:", error)
      throw error
    }
  }

  async createProduct(productData: ProductData | FormData): Promise<ProductData> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const isFormData = productData instanceof FormData
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: isFormData
          ? {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            }
          : {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
        body: isFormData ? productData : JSON.stringify(productData),
      })

      return await this.handleResponse<ProductData>(response)
    } catch (error) {
      console.error("Error creating product:", error)
      throw error
    }
  }

  async updateProduct(id: number, productData: ProductData | FormData): Promise<ProductData> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const isFormData = productData instanceof FormData

      // For FormData, we need to add the method override for Laravel
      if (isFormData) {
        productData.append("_method", "PUT")
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: isFormData ? "POST" : "PUT", // Laravel expects POST with _method override for FormData
        headers: isFormData
          ? {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            }
          : {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
        body: isFormData ? productData : JSON.stringify(productData),
      })

      console.log("Update response status:", response.status)
      return await this.handleResponse<ProductData>(response)
    } catch (error) {
      console.error("Error updating product:", error)
      throw error
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      await this.handleResponse<void>(response)
    } catch (error) {
      console.error("Error deleting product:", error)
      throw error
    }
  }

  async uploadImages(files: FileList): Promise<string[]> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("images[]", file)
      })

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      })

      const data = await this.handleResponse<{ urls?: string[]; images?: string[] }>(response)
      return data.urls || data.images || []
    } catch (error) {
      console.error("Error uploading images:", error)
      throw error
    }
  }

  // Utility methods for common filtering scenarios
  async searchProducts(searchTerm: string, category?: string): Promise<ProductData[]> {
    return this.getProducts({
      search: searchTerm,
      category,
    })
  }

  async getProductsByPriceRange(minPrice: number, maxPrice: number, category?: string): Promise<ProductData[]> {
    return this.getProducts({
      min_price: minPrice,
      max_price: maxPrice,
      category,
    })
  }

  async getInStockProducts(category?: string): Promise<ProductData[]> {
    return this.getProducts({
      in_stock: true,
      category,
    })
  }

  async getProductsSorted(
    sortBy: "name" | "price" | "created_at" | "updated_at",
    sortOrder: "asc" | "desc" = "asc",
    category?: string,
  ): Promise<ProductData[]> {
    return this.getProducts({
      sort_by: sortBy,
      sort_order: sortOrder,
      category,
    })
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        // If categories endpoint doesn't exist, return default categories
        return ["E-Bike", "E-Trike", "E-Scooter", "E-Motorcycle", "E-Dump"]
      }

      const data = await this.handleResponse<string[]>(response)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error("Error fetching categories:", error)
      // Return default categories as fallback
      return ["E-Bike", "E-Trike", "E-Scooter", "E-Motorcycle", "E-Dump"]
    }
  }
}

// Export the API instance
export const productApi = new ProductApi()

// Export utility functions
export const getProductDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    "E-Bike": "Electric Bicycles",
    "E-Trike": "Electric Tricycles",
    "E-Motorcycle": "Electric Motorcycles",
    "E-Dump": "Electric Dump Trucks",
    "E-Scooter": "Electric Scooters",
  }
  return categoryMap[category] || category
}

export const getCategoryFromDisplayName = (displayName: string): string => {
  const displayMap: Record<string, string> = {
    "Electric Bicycles": "E-Bike",
    "Electric Tricycles": "E-Trike",
    "Electric Motorcycles": "E-Motorcycle",
    "Electric Dump Trucks": "E-Dump",
    "Electric Scooters": "E-Scooter",
  }
  return displayMap[displayName] || displayName
}
