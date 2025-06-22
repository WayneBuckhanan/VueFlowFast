// API route definitions for VFF Cloudflare Backend
// Maintains exact endpoint compatibility with existing AWS implementation

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { errorHandler } from '../middleware/error'
import {
  handleCreateItem,
  handleReadItem,
  handleUpdateItem,
  handleDeleteItem,
  handleListChildren,
  handleListUserItems,
  handleHealthCheck,
  handleDebugInfo
} from '../handlers/items'
import type { Env } from '../types/api'

// Create API router
export const createApiRouter = () => {
  const api = new Hono<{ Bindings: Env }>()

  // Global middleware
  api.use('*', cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://*.pages.dev'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Email', 'X-User-Name'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }))

  api.use('*', logger())
  api.use('*', prettyJSON())

  // Authentication middleware for all API routes except health check
  api.use('/*', optionalAuthMiddleware)

  // Error handling
  api.onError(errorHandler)

  // Health and debug endpoints
  api.get('/health', handleHealthCheck)
  api.get('/debug', handleDebugInfo)

  // API v1 routes - maintaining exact compatibility with AWS implementation
  
  // User-specific endpoints (must come first to avoid conflicts)
  api.get('/user/:type', handleListUserItems)
  
  // Primary CRUDL endpoints
  api.post('/:type', handleCreateItem)
  api.get('/:type/:id', handleReadItem)
  api.put('/:type/:id', handleUpdateItem)
  api.delete('/:type/:id', handleDeleteItem)
  
  // Hierarchical endpoints
  api.get('/:parentType/:parentId/:childType', handleListChildren)

  // Catch-all for undefined routes
  api.all('*', (c) => {
    return c.json({
      error: {
        message: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        status: 404
      },
      timestamp: new Date().toISOString(),
      path: c.req.path
    }, 404)
  })

  return api
}

// Export configured router
export const apiRouter = createApiRouter()