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
  api.use('/api/v1/*', optionalAuthMiddleware)

  // Error handling
  api.onError(errorHandler)

  // Health and debug endpoints
  api.get('/health', handleHealthCheck)
  api.get('/debug', handleDebugInfo)

  // API v1 routes - maintaining exact compatibility with AWS implementation
  
  // Primary CRUDL endpoints
  api.post('/api/v1/:type', handleCreateItem)
  api.get('/api/v1/:type/:id', handleReadItem)
  api.put('/api/v1/:type/:id', handleUpdateItem)
  api.delete('/api/v1/:type/:id', handleDeleteItem)
  
  // Hierarchical and user-specific endpoints
  api.get('/api/v1/:parentType/:parentId/:childType', handleListChildren)
  api.get('/api/v1/user/:type', handleListUserItems)

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