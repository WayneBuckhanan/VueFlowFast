import { mande } from 'mande'

// Three pre-initialized mande instances — eliminates the race condition where
// concurrent makeAdmin()/makeUser()/makePublic() calls could swap the single
// `api` reference mid-flight for another component's async CRUDL operation.
const userApi = mande('/api/v3/items')
const adminApi = mande('/api/v3/admin/items')
const publicApi = mande('/api/v3/public/items')

let currentMode: 'user' | 'admin' | 'public' = 'user'

/**
 * Return the mande instance that matches `currentMode`.
 * Every CRUD function calls this **synchronously** at the top of its body
 * so the reference is captured before any `await` yields control.
 */
function getApi() {
  switch (currentMode) {
    case 'admin': return adminApi
    case 'public': return publicApi
    default: return userApi
  }
}

export function makeAdmin() {
  currentMode = 'admin'
}
export function makePublic() {
  currentMode = 'public'
}
export function makeUser() {
  currentMode = 'user'
}
export function setBaseURL(baseUrl: string) {
  // Legacy escape-hatch kept for backward compatibility.
  // Map known prefixes to the correct mode; unknown URLs fall back to 'user'.
  if (baseUrl.startsWith('/api/admin')) {
    currentMode = 'admin'
  } else if (baseUrl.startsWith('/api/public')) {
    currentMode = 'public'
  } else {
    currentMode = 'user'
  }
}

// ---

// Core Types
export interface ItemData {
  [key: string]: any
}

export interface ItemMeta {
  createdAt: string
  updatedAt: string
  version: number
  [key: string]: any
}

export interface Item {
  type: string
  id?: string
  parentType?: string
  parentId?: string
  data?: ItemData
  meta?: ItemMeta
  user?: string
}

export interface QueryResponse {
  items: Item[]
  nextCursor?: string
}

export interface QueryOptions {
  limit?: number
  nextCursor?: string
  user?: string /* admin only */
  summary?: boolean
}

/*
| POST   /api/v2/{type}                              | Partial<Item>     | 201 Item          | Create new item |
| GET    /api/v2/{type}/{id}                         | N/A               | 200 Item          | Read a single item by type and ID |
| PUT    /api/v2/{type}/{id}                         | Partial<Item>     | 200 Item          | Upsert a whole item by replacing/creating with the whole item |
| PATCH  /api/v2/{type}/{id}                         | ItemData          | 200 Item          | Update existing item data field by merging included ItemData values with existing item's data field values |
| DELETE /api/v2/{type}/{id}                         | N/A               | 204 void          | Delete item |
| GET    /api/v2/{parentType}/{parentId}/{childType} | N/A               | 200 QueryResponse | List children of specific type (or 'all') for parent, pagination via ?limit&nextCursor |
| GET    /api/v2/{type}                              | N/A               | 200 QueryResponse | List items of type (or 'all') for current user, pagination via ?limit&nextCursor |
*/

export async function createItem(item: Partial<Item>): Promise<Item> {
  const api = getApi() // snapshot at call time
  return api.post(`/${item?.type}`, item) // admin can specify an item.user value; non-admin users have that overridden by the authN layer user ID
}

export async function readItem(type: string, id: string): Promise<Item> {
  const api = getApi() // snapshot at call time
  return api.get(`/${type}/${id}`) // admin can read any item independent of owner/`user`; non-admin users are limited to entities they own
}

// deprecated updateItem(), use updateItemData() or upsertItem() for clarity
export async function updateItem(type: string, id: string, data: ItemData, options?: { merge?: boolean }) {
  if (options?.merge) {
    // If merge is true, perform a partial update using PATCH
    return updateItemData(type, id, data)
  } else {
    // Otherwise, perform a full replacement using PUT.
    // upsertItem expects a Partial<Item>, so we wrap the data.
    return upsertItem(type, id, { data })
  }
}
export async function upsertItem(type: string, id: string, item: Partial<Item>): Promise<Item> {
  const api = getApi() // snapshot at call time
  return api.put(`/${type}/${id}`, item) // admin can specify an item.user value; non-admin users have that overridden by the authN layer user ID
}

export async function updateItemData(type: string, id: string, data: ItemData): Promise<Item> {
  const api = getApi() // snapshot at call time
  return api.patch(`/${type}/${id}`, data) // admin can update the data of any item independent of owner/`user`
}

export async function deleteItem(type: string, id: string): Promise<void> {
  const api = getApi() // snapshot at call time
  // mande.delete returns the response body, but for a 204 we expect no body.
  // We'll just make the call and not worry about the return value.
  await api.delete(`/${type}/${id}`) // admin can delete any item independent of owner/`user`; non-admin users are limited to entities they own
}

// deprecated listChildren(), use listChildItems() instead
export async function listChildren(parentType: string, parentId: string, childType='all', options?: { limit?: number; nextCursor?: string }): Promise<QueryResponse> {
  return listChildItems(parentType, parentId, childType, options)
}

export async function listChildItems(parentType: string, parentId: string, childType='all', options?: QueryOptions): Promise<QueryResponse> {
  const api = getApi() // snapshot at call time
  const queryParams: Record<string, string> = {}
  if (options?.limit) queryParams.limit = options.limit.toString()
  if (options?.nextCursor) queryParams.nextCursor = options.nextCursor
  if (options?.user) queryParams.user = options.user // admin can limit by options.user or get all entries by default; non-admin users only get their entries
  if (options?.summary) queryParams.summary = 'true'
  
  return api.get<QueryResponse>(`/${parentType}/${parentId}/${childType}`, { query: queryParams })
}

export async function listUserItems(type='all', options?: QueryOptions): Promise<QueryResponse> {
  const api = getApi() // snapshot at call time
  const queryParams: Record<string, string> = {}
  if (options?.limit) queryParams.limit = options.limit.toString()
  if (options?.nextCursor) queryParams.nextCursor = options.nextCursor
  if (options?.user) queryParams.user = options.user // admin can limit by options.user or get all entries by default; non-admin users only get their entries
  if (options?.summary) queryParams.summary = 'true'
  
  return api.get<QueryResponse>(`/${type}`, { query: queryParams })
}
