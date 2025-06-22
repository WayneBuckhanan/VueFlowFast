// src/api.ts
export const apiCall = async (method: string, path: string, data?: any) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include', // Include session cookies
  }

  if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
    options.body = JSON.stringify(data)
  }

  console.log("apiCall", method, path, options)
  
  try {
    const response = await fetch(path, options)
    
    // Handle authentication errors
    if (response.status === 401) {
      // Clear any cached auth state and redirect to login
      throw new ApiError(401, 'Authentication required')
    }
    
    if (response.status === 403) {
      throw new ApiError(403, 'Access forbidden')
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        // If we can't parse error JSON, use the default message
      }
      throw new ApiError(response.status, errorMessage)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null
    }

    // Try to parse JSON response
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const jsonResponse = await response.json()
      console.log("jsonResponse", jsonResponse)
      return jsonResponse
    }

    // Return response text for non-JSON responses
    return await response.text()
  } catch (error) {
    console.error(`API ${method} failed:`, error)
    throw error
  }
}

export const get  = (path: string) => apiCall('get', path)
export const del  = (path: string) => apiCall('delete', path)
export const post = (path: string, data: any) => apiCall('post', path, data)
export const put  = (path: string, data: any) => apiCall('put', path, data)


export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Core Types
export interface ItemData {
  [key: string]: any
}

export interface ItemMeta {
  createdAt: string
  updatedAt: string
  version: number
}

export interface BaseItem {
  type: string
  id: string
  parentType?: string
  parentId?: string
  data?: ItemData
  meta?: ItemMeta
  user?: string // User identifier
}

export interface QueryResponse {
  items: BaseItem[]
  nextOffset: number
}

/*
| POST   /api/v1/{type}                              | Partial<BaseItem> | 201 BaseItem      | Create new item |
| GET    /api/v1/{type}/{id}                         | N/A               | 200 BaseItem      | Get single item by type and ID |
| PUT    /api/v1/{type}/{id}                         | ItemData          | 200 BaseItem      | Update existing item |
| DELETE /api/v1/{type}/{id}                         | N/A               | 200 <empty>       | Delete item |
| GET    /api/v1/{parentType}/{parentId}/{childType} | N/A               | 200 QueryResponse | Get children of specific type (or 'all') for parent, pagination via ?limit&nextCursor |
| GET    /api/v1/user/{type}                         | N/A               | 200 QueryResponse | Get items of type (or 'all') for current user, pagination via ?limit&nextCursor |
*/

export const api = {
  async createItem(item: Partial<BaseItem>): Promise<BaseItem> {
    return await post(`/api/v1/${item?.type}`, item)
  },

  async getItem(type: string, id: string): Promise<BaseItem> {
    return await get(`/api/v1/${type}/${id}`)
  },

  async updateItem(type: string, id: string, data: ItemData): Promise<BaseItem> {
    return await put(`/api/v1/${type}/${id}`, data)
  },

  async deleteItem(type: string, id: string): Promise<void> {
    return del(`/api/v1/${type}/${id}`)
  },

  // TODO add pagination via ?limit&nextOffset // TODO use infinite query?
  async getChildren(parentType: string, parentId: string, childType='all'): Promise<QueryResponse> {
    return get(`/api/v1/${parentType}/${parentId}/${childType}`)
  },

  // TODO add pagination via ?limit&nextOffset // TODO use infinite query?
  async getUserData(type='all'): Promise<QueryResponse> {
    return get(`/api/v1/user/${type}`)
  },
}
