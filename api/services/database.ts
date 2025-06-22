// Database service for VFF Cloudflare Backend
// Refactored to use relational database structure instead of composite keys

import { v4 as uuidv4 } from 'uuid'
import type {
  BaseItem,
  QueryResponse,
  DbItem,
  ItemMeta,
  CreateItemOptions,
  UpdateItemOptions,
  ListChildrenOptions,
  ListUserItemsOptions,
  D1Database
} from '../types/api'
import { ApiError } from '../types/api'

// Transform database row to API format
export function transformDbItem(dbItem: DbItem): BaseItem {
  let data = null
  
  if (dbItem.data !== null && dbItem.data !== undefined && dbItem.data !== '') {
    try {
      data = JSON.parse(dbItem.data)
    } catch (e) {
      console.warn('Failed to parse item data:', e)
      data = null
    }
  }

  const meta: ItemMeta = {
    createdAt: dbItem.createdAt,
    updatedAt: dbItem.updatedAt,
    version: dbItem.version
  }

  return {
    type: dbItem.type,
    id: dbItem.id,
    parentType: dbItem.parentType,
    parentId: dbItem.parentId,
    data,
    meta,
    user: dbItem.user,
  }
}

// Database Service Class
export class DatabaseService {
  constructor(private db: D1Database) {}

  // Create item with parent-child relationships
  async createItem(
    type: string,
    options?: CreateItemOptions
  ): Promise<BaseItem> {
    if (!options?.userId) {
      throw new ApiError(400, 'User ID is required')
    }
    const { userId } = options
    let { id, parentType, parentId, data } = options

    if (!id) {
      id = uuidv4()
    }
    if (!parentType || !parentId) {
      parentType = 'user'
      parentId = userId
    }

    const stmt = this.db.prepare(`
      INSERT INTO items (type, id, parentType, parentId, data, user, version)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `)

    try {
      await stmt.bind(
        type,
        id,
        parentType,
        parentId,
        data !== null && data !== undefined ? JSON.stringify(data) : null,
        userId
      ).run()

      // Fetch the created item to return with proper timestamps
      const createdItem = await this.readItem(type, id)
      return createdItem
    } catch (error) {
      console.error('Database create error:', error)
      
      // Handle constraint violations as client errors (400)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new ApiError(400, 'Item with this ID already exists', 'DUPLICATE_ID')
      }
      
      // Handle other database errors as server errors (500)
      throw new ApiError(500, 'Failed to create item')
    }
  }

  // Read single item
  async readItem(type: string, id: string): Promise<BaseItem> {
    const stmt = this.db.prepare(`
      SELECT * FROM items
      WHERE type = ? AND id = ?
      LIMIT 1
    `)

    try {
      const result = await stmt.bind(type, id).first<DbItem>()
      
      if (!result) {
        throw new ApiError(404, 'Item not found')
      }

      const item = transformDbItem(result)
      return item
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      console.error('Database read error:', error)
      throw new ApiError(500, 'Failed to read item')
    }
  }

  // Update item with merge capability
  async updateItem(
    type: string,
    id: string,
    data: any,
    options?: UpdateItemOptions
  ): Promise<BaseItem> {
    // First, get the existing item
    const existingItem = await this.readItem(type, id)
    
    if (!existingItem) {
      throw new ApiError(404, 'Item not found')
    }

    let updatedData = data
    if (options?.merge) {
      updatedData = { ...existingItem.data, ...data }
    }

    const newVersion = (existingItem.meta?.version || 0) + 1

    const stmt = this.db.prepare(`
      UPDATE items
      SET data = ?, version = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE type = ? AND id = ?
    `)

    try {
      await stmt.bind(
        JSON.stringify(updatedData || {}),
        newVersion,
        type,
        id
      ).run()

      // Fetch the updated item to return with proper timestamps
      const updatedItem = await this.readItem(type, id)
      return updatedItem
    } catch (error) {
      console.error('Database update error:', error)
      throw new ApiError(500, 'Failed to update item')
    }
  }

  // Delete item
  async deleteItem(type: string, id: string, userId?: string): Promise<void> {
    try {
      // First verify item exists and belongs to user if userId provided
      const existing = await this.readItem(type, id)
      if (userId && existing.user !== userId) {
        throw new ApiError(404, 'Item not found')
      }

      // Recursively delete all children first
      await this.deleteItemAndChildren(type, id)

    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      console.error('Database delete error:', error)
      throw new ApiError(500, 'Failed to delete item')
    }
  }

  // Helper method to recursively delete item and all its children
  private async deleteItemAndChildren(type: string, id: string): Promise<void> {
    // First, find all direct children
    const childrenQuery = `
      SELECT type, id FROM items
      WHERE parentType = ? AND parentId = ?
    `
    const childrenResult = await this.db.prepare(childrenQuery).bind(type, id).all<{type: string, id: string}>()
    const children = childrenResult.results || []

    // Recursively delete each child and their children
    for (const child of children) {
      await this.deleteItemAndChildren(child.type, child.id)
    }

    // Finally, delete the item itself
    const deleteResult = await this.db.prepare(`
      DELETE FROM items
      WHERE type = ? AND id = ?
    `).bind(type, id).run()

    if (!deleteResult.success) {
      throw new ApiError(500, 'Failed to delete item')
    }
  }

  // List child items with pagination
  async listChildren(
    parentType: string,
    parentId: string,
    childType?: string,
    options?: ListChildrenOptions
  ): Promise<QueryResponse> {
    const { limit = 50, offset = 0 } = options || {}

    let query = `
      SELECT * FROM items 
      WHERE parentType = ? AND parentId = ?
    `
    const params: any[] = [parentType, parentId]

    if (childType && childType !== 'all') {
      query += ` AND type = ?`
      params.push(childType)
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    params.push(limit + 1, offset) // Get one extra to determine if there are more results

    const stmt = this.db.prepare(query)

    try {
      const result = await stmt.bind(...params).all<DbItem>()
      const items = result.results || []

      // Check if there are more results
      const hasMore = items.length > limit
      if (hasMore) {
        items.pop() // Remove the extra item
      }

      const transformedItems = items.map(transformDbItem)
      
      // Calculate next offset if there are more results
      const nextOffset = hasMore ? offset + limit : 0

      return {
        items: transformedItems,
        nextOffset
      }
    } catch (error) {
      console.error('Database list children error:', error)
      throw new ApiError(500, 'Failed to list children')
    }
  }

  // List user items with pagination
  async listUserItems(
    userId: string,
    type?: string,
    options?: ListUserItemsOptions
  ): Promise<QueryResponse> {
    const { limit = 50, offset = 0 } = options || {}

    let query = `
      SELECT * FROM items 
      WHERE user = ?
    `
    const params: any[] = [userId]

    if (type && type !== 'all') {
      query += ` AND type = ?`
      params.push(type)
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`
    params.push(limit + 1, offset) // Get one extra to determine if there are more results

    const stmt = this.db.prepare(query)

    try {
      const result = await stmt.bind(...params).all<DbItem>()
      const items = result.results || []

      // Check if there are more results
      const hasMore = items.length > limit
      if (hasMore) {
        items.pop() // Remove the extra item
      }

      const transformedItems = items.map(transformDbItem)
      
      // Calculate next offset if there are more results
      const nextOffset = hasMore ? offset + limit : 0

      return {
        items: transformedItems,
        nextOffset
      }
    } catch (error) {
      console.error('Database list user items error:', error)
      throw new ApiError(500, 'Failed to list user items')
    }
  }
}