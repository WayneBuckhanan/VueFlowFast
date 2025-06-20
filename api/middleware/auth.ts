// Authentication middleware for VFF Cloudflare Backend
// Placeholder implementation - will be enhanced with OpenAuth integration later

import { Context, Next } from 'hono'
import { ApiError } from '../types/api'

export interface AuthContext {
  userId: string
  email?: string
  name?: string
}

// Extract user information from request headers
// This is a placeholder implementation that will be replaced with proper OpenAuth integration
export const extractUserFromRequest = (c: Context): AuthContext => {
  // For development/testing, we'll use a header-based approach
  const authHeader = c.req.header('Authorization')
  const userId = c.req.header('X-User-ID') || 'not-logged-in'
  const email = c.req.header('X-User-Email')
  const name = c.req.header('X-User-Name')

  // In production, this would validate JWT tokens from OpenAuth
  if (!authHeader && userId === 'not-logged-in') {
    console.warn('No authentication provided, using default user')
  }

  return {
    userId,
    email,
    name
  }
}

// Authentication middleware
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authContext = extractUserFromRequest(c)
    
    // Store auth context in Hono context for use in handlers
    c.set('auth', authContext)
    c.set('userId', authContext.userId)
    
    await next()
  } catch (error) {
    console.error('Authentication error:', error)
    throw new ApiError(401, 'Authentication failed', 'AUTH_FAILED')
  }
}

// Optional authentication middleware (doesn't throw if no auth)
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authContext = extractUserFromRequest(c)
    c.set('auth', authContext)
    c.set('userId', authContext.userId)
  } catch (error) {
    console.warn('Optional auth failed:', error)
    // Set default values for unauthenticated requests
    c.set('auth', { userId: 'not-logged-in' })
    c.set('userId', 'not-logged-in')
  }
  
  await next()
}

// Helper to get authenticated user from context
export const getAuthenticatedUser = (c: Context): AuthContext => {
  const auth = c.get('auth')
  if (!auth || auth.userId === 'not-logged-in') {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED')
  }
  return auth
}

// Helper to get user ID from context (with fallback)
export const getUserId = (c: Context): string => {
  return c.get('userId') || 'not-logged-in'
}

// Validate user permissions (placeholder for future enhancement)
export const validateUserPermissions = (
  c: Context, 
  resource: string, 
  action: string
): boolean => {
  const auth = c.get('auth')
  
  // For now, all authenticated users have full permissions
  // This will be enhanced with proper role-based access control
  if (!auth || auth.userId === 'not-logged-in') {
    return false
  }
  
  // TODO: Implement proper permission checking
  // - Check user roles
  // - Check resource ownership
  // - Check action permissions
  
  return true
}

// Authorization middleware for protected routes
export const requireAuth = async (c: Context, next: Next) => {
  const auth = c.get('auth')
  
  if (!auth || auth.userId === 'not-logged-in') {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED')
  }
  
  await next()
}

// Authorization middleware with permission checking
export const requirePermission = (resource: string, action: string) => {
  return async (c: Context, next: Next) => {
    const hasPermission = validateUserPermissions(c, resource, action)
    
    if (!hasPermission) {
      throw new ApiError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS')
    }
    
    await next()
  }
}