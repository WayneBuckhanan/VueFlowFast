// src/api.ts
import * as AWS from 'aws-amplify/api'
import { fetchAuthSession } from 'aws-amplify/auth'
const config = { apiName: 'default', }

export const apiCall = async (method: string, path: string, data?: any) => {
  const session = await fetchAuthSession()
  const token = session?.tokens?.idToken || ''
  const headers = {}
  if (token) {
    headers['Authorization'] = token.toString()
    headers['Content-Type'] = 'application/json'
  }
  const options = { ...data, headers }
  console.log("apiCall", method, path, token, options)
  try {
    const response = await AWS[method]({ apiName: config.apiName, path, options }).response
    if(response.statusCode === 204) return response // 204 No Content (so no body) but may have something in response.headers worth seeing
    const jsonResponse = response.body.json()
    //console.log("jsonResponse", jsonResponse)
    return jsonResponse
  } catch (error) {
    console.error(`AWS ${method} failed:`, error)
    //if(error.response?.status !== 404) 
    throw error
  }
};
export const get  = (path: string) => apiCall('get', path)
export const del  = (path: string) => apiCall('del', path)
export const post = (path: string, data: any) => apiCall('post', path, { body: data })
export const put  = (path: string, data: any) => apiCall('put',  path, { body: data })


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
  type: string // sk <=> TYPE#id or TYPE
  id?: string
  parentType?: string // pk <=> parentType#parentId or USER#userId
  parentId?: string
  data?: ItemData
  meta?: ItemMeta
  user?: string // Cognito user sub
}

export interface ItemResponse {
  items: BaseItem[]
}

export interface QueryResponse extends ItemResponse {
  nextCursor?: string
}

/*
| POST   /api/v1/{type}                              | Partial<BaseItem> | 201 ItemResponse  | Create new item |
| GET    /api/v1/{type}/{id}                         | N/A               | 200 ItemResponse  | Get single item by type and ID |
| PUT    /api/v1/{type}/{id}                         | ItemData          | 200 ItemResponse  | Update existing item |
| DELETE /api/v1/{type}/{id}                         | N/A               | 200 <Dynamo ret>  | Delete item |
| GET    /api/v1/{parentType}/{parentId}/{childType} | N/A               | 200 QueryResponse | Get children of specific type (or 'all') for parent, pagination via ?limit&nextCursor |
| GET    /api/v1/user/{type}                         | N/A               | 200 QueryResponse | Get items of type (or 'all') for current user, pagination via ?limit&nextCursor |
*/

export const api = {
  async createItem(item: Partial<BaseItem>): Promise<BaseItem> {
    return post(`/api/v1/${item?.type}`, item)
  },

  async getItem(type: string, id: string): Promise<BaseItem> {
    return get(`/api/v1/${type}/${id}`)
  },

  async updateItem(type: string, id: string, data: ItemData): Promise<BaseItem> {
    return put(`/api/v1/${type}/${id}`, data)
  },

  async deleteItem(type: string, id: string): Promise<void> {
    return del(`/api/v1/${type}/${id}`)
  },

  // TODO add pagination via ?limit&nextCursor // TODO use infinite query?
  async getChildren(parentType: string, parentId: string, childType='all'): Promise<QueryResponse> {
    return get(`/api/v1/${parentType}/${parentId}/${childType}`)
  },

  // TODO add pagination via ?limit&nextCursor // TODO use infinite query?
  async getUserData(type='all'): Promise<QueryResponse> {
    return get(`/api/v1/user/${type}`)
  },
}

