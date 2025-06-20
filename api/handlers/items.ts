// HTTP handlers for VFF Cloudflare Backend
// Updated for relational database structure

import { Context } from 'hono'
import { DatabaseService } from '../services/database'
import { getUserId, getAuthenticatedUser } from '../middleware/auth'
import { validateRequired, validateType, notFoundError } from '../middleware/error'
import type { Env, CreateItemRequest, UpdateItemRequest } from '../types/api'

// Helper to get database service from context
const getDbService = (c: Context): DatabaseService => {
  const env = c.env as Env
  return new DatabaseService(env.DB)
}

// Helper to parse query parameters
const parseQueryParams = (c: Context) => {
  const url = new URL(c.req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const merge = url.searchParams.get('merge') === 'true' || url.searchParams.get('merge') === ''
  
  return { limit, offset, merge }
}

// POST /:type - Create new item
export const handleCreateItem = async (c: Context) => {
  try {
    const type = c.req.param('type')
    const userId = getUserId(c)
    
    validateRequired(type, 'type')
    
    const body = await c.req.json() as CreateItemRequest
    const { data, id, parentType, parentId } = body
    
    const dbService = getDbService(c)
    const item = await dbService.createItem(type, {
      id,
      data,
      parentType,
      parentId,
      userId
    })
    
    return c.json(item, 201)
  } catch (error) {
    throw error
  }
}

// GET /:type/:id - Get single item by type and ID
export const handleReadItem = async (c: Context) => {
  try {
    const type = c.req.param('type')
    const id = c.req.param('id')
    
    validateRequired(type, 'type')
    validateRequired(id, 'id')
    
    const dbService = getDbService(c)
    const item = await dbService.readItem(type, id)
    
    return c.json(item, 200)
  } catch (error) {
    throw error
  }
}

// PUT /:type/:id - Update existing item
export const handleUpdateItem = async (c: Context) => {
  try {
    const type = c.req.param('type')
    const id = c.req.param('id')
    const { merge } = parseQueryParams(c)
    
    validateRequired(type, 'type')
    validateRequired(id, 'id')
    
    const data = await c.req.json() as UpdateItemRequest
    
    const dbService = getDbService(c)
    const item = await dbService.updateItem(type, id, data, { merge })
    
    return c.json(item, 200)
  } catch (error) {
    throw error
  }
}

// DELETE /:type/:id - Delete item
export const handleDeleteItem = async (c: Context) => {
  try {
    const type = c.req.param('type')
    const id = c.req.param('id')
    const userId = getUserId(c)
    
    validateRequired(type, 'type')
    validateRequired(id, 'id')
    
    const dbService = getDbService(c)
    await dbService.deleteItem(type, id, userId)
    
    // Return empty response with 200 status (matching AWS implementation)
    return c.json({}, 200)
  } catch (error) {
    throw error
  }
}

// GET /:parentType/:parentId/:childType - Get children of specific type for parent
export const handleListChildren = async (c: Context) => {
  try {
    const parentType = c.req.param('parentType')
    const parentId = c.req.param('parentId')
    const childType = c.req.param('childType') || 'all'
    const { limit, offset } = parseQueryParams(c)
    
    validateRequired(parentType, 'parentType')
    validateRequired(parentId, 'parentId')
    
    const dbService = getDbService(c)
    const response = await dbService.listChildren(parentType, parentId, childType, {
      limit,
      offset
    })
    
    return c.json(response, 200)
  } catch (error) {
    throw error
  }
}

// GET /user/:type - Get items of type for current user
export const handleListUserItems = async (c: Context) => {
  try {
    const type = c.req.param('type') || 'all'
    const userId = getUserId(c)
    const { limit, offset } = parseQueryParams(c)
    
    const dbService = getDbService(c)
    const response = await dbService.listUserItems(userId, type, {
      limit,
      offset
    })
    
    return c.json(response, 200)
  } catch (error) {
    throw error
  }
}

// Health check endpoint
export const handleHealthCheck = async (c: Context) => {
  try {
    const env = c.env as Env
    
    // Test database connection
    const dbService = getDbService(c)
    await env.DB.prepare('SELECT 1').first()
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || 'unknown',
      version: '1.0.0'
    }, 200)
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503)
  }
}

// Debug endpoint for development
export const handleDebugInfo = async (c: Context) => {
  try {
    const env = c.env as Env
    const userId = getUserId(c)
    const auth = c.get('auth')
    
    // Convert headers to plain object
    const headers: Record<string, string> = {}
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value
    })
    
    return c.json({
      environment: env.ENVIRONMENT || 'unknown',
      userId,
      auth,
      headers,
      url: c.req.url,
      method: c.req.method,
      timestamp: new Date().toISOString()
    }, 200)
  } catch (error) {
    throw error
  }
}