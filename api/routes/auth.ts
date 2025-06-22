// Authentication routes for VFF Cloudflare Backend
// Handles login, verification, logout, and user info endpoints

import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { createAuthService } from '../services/auth'
import { createEmailService } from '../services/email'
import { ApiError } from '../types/api'

type Bindings = {
  DB: any // D1Database
  MAILJET_API_KEY: string
  MAILJET_SECRET_KEY: string
  FROM_EMAIL: string
  FROM_NAME: string
}

const auth = new Hono<{ Bindings: Bindings }>()

/**
 * POST /auth/login
 * Send verification code to email
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      throw new ApiError(400, 'Email is required', 'INVALID_EMAIL')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new ApiError(400, 'Invalid email format', 'INVALID_EMAIL')
    }

    // Create services
    const emailService = createEmailService(c.env)
    const authService = createAuthService(c.env.DB, emailService)

    // Send verification code
    const result = await authService.sendVerificationCode(email)

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to send verification code', 'EMAIL_SEND_FAILED')
    }

    return c.json({
      success: true,
      message: 'Verification code sent to your email'
    })

  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.status as any)
    }

    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

/**
 * POST /auth/verify
 * Verify code and create session
 */
auth.post('/verify', async (c) => {
  try {
    const body = await c.req.json()
    const { email, code } = body

    if (!email || !code) {
      throw new ApiError(400, 'Email and code are required', 'MISSING_CREDENTIALS')
    }

    if (typeof email !== 'string' || typeof code !== 'string') {
      throw new ApiError(400, 'Invalid email or code format', 'INVALID_CREDENTIALS')
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      throw new ApiError(400, 'Invalid verification code format', 'INVALID_CODE')
    }

    // Create services
    const emailService = createEmailService(c.env)
    const authService = createAuthService(c.env.DB, emailService)

    // Verify code and login
    const result = await authService.verifyCodeAndLogin(email, code)

    if (!result.success) {
      throw new ApiError(401, result.error || 'Invalid verification code', 'VERIFICATION_FAILED')
    }

    // Set session cookie
    const cookieOptions = [
      `HttpOnly`,
      `Secure`,
      `SameSite=Strict`,
      `Path=/`,
      `Max-Age=${30 * 24 * 60 * 60}` // 30 days
    ].join('; ')

    c.header('Set-Cookie', `session=${result.session!.token}; ${cookieOptions}`)

    return c.json({
      success: true,
      user: result.user,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Verify error:', error)
    
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.status as any)
    }

    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

/**
 * POST /auth/logout
 * Logout user and invalidate session
 */
auth.post('/logout', async (c) => {
  try {
    // Get session token from cookie or header
    const sessionToken = getCookie(c, 'session') ||
                        c.req.header('Authorization')?.replace('Bearer ', '')

    if (sessionToken) {
      // Create services
      const emailService = createEmailService(c.env)
      const authService = createAuthService(c.env.DB, emailService)

      // Logout
      await authService.logout(sessionToken)
    }

    // Clear session cookie
    c.header('Set-Cookie', `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`)

    return c.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

/**
 * GET /auth/me
 * Get current user information
 */
auth.get('/me', async (c) => {
  try {
    // Get session token from cookie or header
    const sessionToken = getCookie(c, 'session') ||
                        c.req.header('Authorization')?.replace('Bearer ', '')

    if (!sessionToken) {
      throw new ApiError(401, 'No session token provided', 'NO_TOKEN')
    }

    // Create services
    const emailService = createEmailService(c.env)
    const authService = createAuthService(c.env.DB, emailService)

    // Validate session
    const user = await authService.validateSession(sessionToken)

    if (!user) {
      throw new ApiError(401, 'Invalid or expired session', 'INVALID_SESSION')
    }

    return c.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Get user error:', error)
    
    if (error instanceof ApiError) {
      return c.json({
        success: false,
        error: error.message,
        code: error.code
      }, error.status as any)
    }

    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

/**
 * POST /auth/cleanup
 * Maintenance endpoint to clean up expired data
 */
auth.post('/cleanup', async (c) => {
  try {
    // This could be called by a cron job or scheduled task
    const emailService = createEmailService(c.env)
    const authService = createAuthService(c.env.DB, emailService)

    await authService.cleanupExpiredData()

    return c.json({
      success: true,
      message: 'Cleanup completed'
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

export { auth as authRoutes }