// Main Cloudflare Worker entry point for VFF Backend
// Hono-based API server with D1 database integration and OpenAuth

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiRouter } from './routes/api'
import { authRoutes } from './routes/auth'
import { errorHandler } from './middleware/error'
import { authMiddleware } from './middleware/auth'
import type { Env } from './types/api'

// Create main application
const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://vff.example.com'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Error handling middleware (commented out for now due to type issues)
// app.use('*', errorHandler)

// Authentication routes (public - no auth required)
app.route('/auth', authRoutes)

// Protected API routes (require authentication)
app.use('/api/*', authMiddleware)
app.route('/api/v1', apiRouter)

// Health check endpoint (public)
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Debug endpoint (public for development)
app.get('/debug', async (c) => {
  const headers: Record<string, string> = {}
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  return c.json({
    environment: c.env.ENVIRONMENT || 'unknown',
    timestamp: new Date().toISOString(),
    headers,
    url: c.req.url,
    method: c.req.method
  })
})

// Root endpoint with API documentation
app.get('/', (c) => {
  return c.json({
    name: 'VFF Cloudflare Backend',
    version: '1.0.0',
    description: 'Cloudflare Workers backend with D1 database and OpenAuth for VFF application',
    authentication: {
      'Send Code': 'POST /auth/login',
      'Verify Code': 'POST /auth/verify',
      'Get User': 'GET /auth/me',
      'Logout': 'POST /auth/logout'
    },
    endpoints: {
      health: '/health',
      debug: '/debug',
      api: '/api/v1'
    },
    api_documentation: {
      'Create Item': 'POST /api/v1/{type}',
      'Read Item': 'GET /api/v1/{type}/{id}',
      'Update Item': 'PUT /api/v1/{type}/{id}',
      'Delete Item': 'DELETE /api/v1/{type}/{id}',
      'List Children': 'GET /api/v1/{parentType}/{parentId}/{childType}',
      'List User Items': 'GET /api/v1/user/{type}'
    },
    notes: [
      'All /api/v1/* endpoints require authentication',
      'Use POST /auth/login to get verification code',
      'Use POST /auth/verify to authenticate and get session',
      'Session is stored in httpOnly cookie'
    ],
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString()
  }, 404)
})

// Export the app as the default export for Cloudflare Workers
export default app

// Export for local development and testing
export { app }
