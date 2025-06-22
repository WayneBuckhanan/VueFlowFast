// Authentication middleware for VFF Cloudflare Backend
// Updated to use OpenAuth integration with session-based authentication

import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { createAuthService } from '../services/auth'
import { createEmailService } from '../services/email'
import { ApiError } from '../types/api'

export interface AuthContext {
  userId: string
  email?: string
  name?: string
}

/**
 * Extract user information from session token
 */
export const extractUserFromRequest = async (c: Context): Promise<AuthContext | null> => {
  try {
    // Get session token from cookie or Authorization header
    const sessionToken = getCookie(c, 'session') || 
                        c.req.header('Authorization')?.replace('Bearer ', '')

    if (!sessionToken) {
      return null
    }

    // Create auth service
    const emailService = createEmailService(c.env)
    const authService = createAuthService(c.env.DB, emailService)

    // Validate session and get user
    const sessionResult = await authService.validateSession(sessionToken)

    if (!sessionResult.valid || !sessionResult.user) {
      return null
    }

    return {
      userId: sessionResult.user.id,
      email: sessionResult.user.email,
      name: sessionResult.user.name
    }
  } catch (error) {
    console.error('Error extracting user from request:', error)
    return null
  }
}

/**
 * Authentication middleware - requires valid authentication
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authContext = await extractUserFromRequest(c)
    
    if (!authContext) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED')
    }
    
    // Store auth context in Hono context for use in handlers
    c.set('auth', authContext)
    c.set('userId', authContext.userId)
    
    await next()
  } catch (error) {
    console.error('Authentication error:', error)
    
    if (error instanceof ApiError) {
      return c.json({ 
        success: false, 
        error: error.message,
        code: error.code 
      }, error.status as any)
    }

    return c.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, 401)
  }
}

/**
 * Optional authentication middleware - doesn't throw if no auth
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authContext = await extractUserFromRequest(c)
    
    if (authContext) {
      c.set('auth', authContext)
      c.set('userId', authContext.userId)
    } else {
      // Set default values for unauthenticated requests
      c.set('auth', { userId: 'not-logged-in' })
      c.set('userId', 'not-logged-in')
    }
  } catch (error) {
    console.warn('Optional auth failed:', error)
    // Set default values for unauthenticated requests
    c.set('auth', { userId: 'not-logged-in' })
    c.set('userId', 'not-logged-in')
  }
  
  await next()
}

/**
 * Helper to get authenticated user from context
 */
export const getAuthenticatedUser = (c: Context): AuthContext => {
  const auth = c.get('auth')
  if (!auth || auth.userId === 'not-logged-in') {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED')
  }
  return auth
}

/**
 * Helper to get user ID from context (with fallback)
 */
export const getUserId = (c: Context): string => {
  return c.get('userId') || 'not-logged-in'
}

/**
 * Validate user permissions (placeholder for future enhancement)
 */
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

/**
 * Authorization middleware for protected routes
 */
export const requireAuth = async (c: Context, next: Next) => {
  const auth = c.get('auth')
  
  if (!auth || auth.userId === 'not-logged-in') {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED')
  }
  
  await next()
}

/**
 * Authorization middleware with permission checking
 */
export const requirePermission = (resource: string, action: string) => {
  return async (c: Context, next: Next) => {
    const hasPermission = validateUserPermissions(c, resource, action)
    
    if (!hasPermission) {
      throw new ApiError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS')
    }
    
    await next()
  }
}