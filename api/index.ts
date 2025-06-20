// Main Cloudflare Worker entry point for VFF Backend
// Hono-based API server with D1 database integration

import { Hono } from 'hono'
import { apiRouter } from './routes/api'
import type { Env } from './types/api'

// Create main application
const app = new Hono<{ Bindings: Env }>()

// Mount API router
app.route('/', apiRouter)

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'VFF Cloudflare Backend',
    version: '1.0.0',
    description: 'Cloudflare Workers backend with D1 database for VFF application',
    endpoints: {
      health: '/health',
      debug: '/debug',
      api: '/api/v1'
    },
    documentation: {
      'Create Item': 'POST /api/v1/{type}',
      'Read Item': 'GET /api/v1/{type}/{id}',
      'Update Item': 'PUT /api/v1/{type}/{id}',
      'Delete Item': 'DELETE /api/v1/{type}/{id}',
      'List Children': 'GET /api/v1/{parentType}/{parentId}/{childType}',
      'List User Items': 'GET /api/v1/user/{type}'
    },
    timestamp: new Date().toISOString()
  })
})

// Export the app as the default export for Cloudflare Workers
export default app

// Export for local development and testing
export { app }