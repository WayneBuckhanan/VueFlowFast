import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createTestUser, createTestSession, mockEnv } from './setup.js'
import { env } from "cloudflare:test"

// Import auth services and routes
import { AuthService } from '../api/services/auth.js'
import { EmailService } from '../api/services/email.js'
import { authRoutes } from '../api/routes/auth.js'

// Create test app
const createTestApp = () => {
  const app = new Hono()
  
  // Add middleware to set env
  app.use('*', async (c, next) => {
    c.env = { ...mockEnv, DB: c.env.DB }
    await next()
  })
  
  // Mount auth routes
  app.route('/auth', authRoutes)
  
  return app
}

describe('Authentication', () => {
  let app
  let authService
  let emailService

  beforeEach(async () => {
    app = createTestApp()
    emailService = new EmailService(mockEnv)
    authService = new AuthService(env.DB, emailService)
    mockEnv.DB = env.DB
  })

  describe('AuthService', () => {
    describe('sendVerificationCode', () => {
      it('should generate and store a 6-digit code', async () => {
        const email = 'test@example.com'
        const result = await authService.sendVerificationCode(email)
        
        expect(result.success).toBe(true)
        
        // Verify code is stored in database
        const stored = await env.DB.prepare(`
          SELECT * FROM verification_codes WHERE email = ? ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        expect(stored).toBeTruthy()
        expect(stored.email).toBe(email)
        expect(stored.code).toMatch(/^\d{6}$/)
        expect(stored.used).toBe(0)
      })

      it('should set expiration time', async () => {
        const email = 'test@example.com'
        const result = await authService.sendVerificationCode(email)
        
        expect(result.success).toBe(true)
        
        const stored = await env.DB.prepare(`
          SELECT * FROM verification_codes WHERE email = ? ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        const expiresAt = new Date(stored.expiresAt)
        const now = new Date()
        const diffMinutes = (expiresAt - now) / (1000 * 60)
        
        expect(diffMinutes).toBeGreaterThan(9) // Should be ~10 minutes
        expect(diffMinutes).toBeLessThan(11)
      })

      it('should invalidate previous codes for same email', async () => {
        const email = 'test@example.com'
        
        // Send first code
        const result1 = await authService.sendVerificationCode(email)
        expect(result1.success).toBe(true)
        
        // Get first code
        const code1 = await env.DB.prepare(`
          SELECT code FROM verification_codes WHERE email = ? ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        // Send second code
        const result2 = await authService.sendVerificationCode(email)
        expect(result2.success).toBe(true)
        
        // Get second code
        const code2 = await env.DB.prepare(`
          SELECT code FROM verification_codes WHERE email = ? ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        expect(code1.code).not.toBe(code2.code)
        
        // First code should be marked as used
        const firstCode = await env.DB.prepare(`
          SELECT * FROM verification_codes WHERE email = ? AND code = ?
        `).bind(email, code1.code).first()
        
        expect(firstCode.used).toBe(1)
        
        // Second code should be active
        const secondCode = await env.DB.prepare(`
          SELECT * FROM verification_codes WHERE email = ? AND code = ?
        `).bind(email, code2.code).first()
        
        expect(secondCode.used).toBe(0)
      })
    })

    describe('verifyCode', () => {
      it('should verify valid code', async () => {
        const email = 'test@example.com'
        
        // First send verification code to store it in database
        const sendResult = await authService.sendVerificationCode(email)
        expect(sendResult.success).toBe(true)
        
        // Get the stored code from database to use for verification
        const storedCode = await env.DB.prepare(`
          SELECT code FROM verification_codes
          WHERE email = ? AND used = FALSE
          ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        expect(storedCode).toBeTruthy()
        
        const result = await authService.verifyCode(email, storedCode.code)
        
        expect(result.success).toBe(true)
        expect(result.user).toBeTruthy()
        expect(result.user.email).toBe(email)
        // verifyCode doesn't return session, only verifyCodeAndLogin does
        expect(result.session).toBeUndefined()
      })

      it('should reject invalid code', async () => {
        const email = 'test@example.com'
        await authService.sendVerificationCode(email)
        
        const result = await authService.verifyCode(email, '000000')
        
        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid or expired verification code')
      })

      it('should reject expired code', async () => {
        const email = 'test@example.com'
        const sendResult = await authService.sendVerificationCode(email)
        expect(sendResult.success).toBe(true)
        
        // Get the stored code
        const storedCode = await env.DB.prepare(`
          SELECT code FROM verification_codes WHERE email = ? ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        // Manually expire the code
        await env.DB.prepare(`
          UPDATE verification_codes
          SET expiresAt = datetime('now', '-1 hour')
          WHERE email = ? AND code = ?
        `).bind(email, storedCode.code).run()
        
        const result = await authService.verifyCode(email, storedCode.code)
        
        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid or expired verification code')
      })

      it('should reject used code', async () => {
        const email = 'test@example.com'
        const sendResult = await authService.sendVerificationCode(email)
        expect(sendResult.success).toBe(true)
        
        // Get the stored code
        const storedCode = await env.DB.prepare(`
          SELECT code FROM verification_codes WHERE email = ? ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        // Use the code once
        await authService.verifyCode(email, storedCode.code)
        
        // Try to use it again
        const result = await authService.verifyCode(email, storedCode.code)
        
        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid or expired verification code')
      })

      it('should create user if not exists', async () => {
        const email = 'newuser@example.com'
        
        // First send verification code to store it in database
        const sendResult = await authService.sendVerificationCode(email)
        expect(sendResult.success).toBe(true)
        
        // Get the stored code from database to use for verification
        const storedCode = await env.DB.prepare(`
          SELECT code FROM verification_codes
          WHERE email = ? AND used = FALSE
          ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        expect(storedCode).toBeTruthy()
        
        const result = await authService.verifyCode(email, storedCode.code)
        
        expect(result.success).toBe(true)
        expect(result.user.email).toBe(email)
        
        // Verify user was created in database
        const user = await env.DB.prepare(`
          SELECT * FROM users WHERE email = ?
        `).bind(email).first()
        
        expect(user).toBeTruthy()
        expect(user.email).toBe(email)
      })

      it('should update existing user login time', async () => {
        const email = 'existing@example.com'
        
        // Create existing user
        const existingUser = await createTestUser(env.DB, { email })
        
        // First send verification code to store it in database
        const sendResult = await authService.sendVerificationCode(email)
        expect(sendResult.success).toBe(true)
        
        // Get the stored code from database to use for verification
        const storedCode = await env.DB.prepare(`
          SELECT code FROM verification_codes
          WHERE email = ? AND used = FALSE
          ORDER BY createdAt DESC LIMIT 1
        `).bind(email).first()
        
        expect(storedCode).toBeTruthy()
        
        const result = await authService.verifyCode(email, storedCode.code)
        
        expect(result.success).toBe(true)
        expect(result.user.id).toBe(existingUser.id)
        
        // Verify lastLoginAt was updated
        const updatedUser = await env.DB.prepare(`
          SELECT * FROM users WHERE id = ?
        `).bind(existingUser.id).first()
        
        expect(updatedUser.lastLoginAt).toBeTruthy()
      })
    })

    describe('validateSession', () => {
      it('should validate valid session', async () => {
        const user = await createTestUser(env.DB)
        const session = await createTestSession(env.DB, user.id)
        
        const result = await authService.validateSession(session.token)
        
        expect(result.valid).toBe(true)
        expect(result.user.id).toBe(user.id)
        expect(result.session.id).toBe(session.id)
      })

      it('should reject invalid token', async () => {
        const result = await authService.validateSession('invalid-token')
        
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Invalid session')
      })

      it('should reject expired session', async () => {
        const user = await createTestUser(env.DB)
        const session = await createTestSession(env.DB, user.id, {
          expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
        })
        
        const result = await authService.validateSession(session.token)
        
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Session expired')
      })
    })

    describe('logout', () => {
      it('should invalidate session', async () => {
        const user = await createTestUser(env.DB)
        const session = await createTestSession(env.DB, user.id)
        
        await authService.logout(session.token)
        
        // Session should be deleted
        const deletedSession = await env.DB.prepare(`
          SELECT * FROM user_sessions WHERE token = ?
        `).bind(session.token).first()
        
        expect(deletedSession).toBeFalsy()
      })

      it('should handle non-existent session gracefully', async () => {
        // Should not throw error
        await expect(authService.logout('non-existent-token')).resolves.toBeUndefined()
      })
    })
  })

  describe('Auth API Endpoints', () => {
    describe('POST /auth/login', () => {
      it('should send verification code for valid email', async () => {
        const response = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' })
        }, env)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.message).toContain('Verification code sent')

        // Verify code was created in database
        const code = await env.DB.prepare(`
          SELECT * FROM verification_codes WHERE email = ?
        `).bind('test@example.com').first()
        
        expect(code).toBeTruthy()
      })

      it('should reject invalid email format', async () => {
        const response = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'invalid-email' })
        }, env)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('valid email')
      })

      it('should reject missing email', async () => {
        const response = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }, env)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Email is required')
      })
    })

    describe('POST /auth/verify', () => {
      it('should verify valid code and return session', async () => {
        const email = 'test@example.com'
        
        // First send code
        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }, env)

        // Get the code from database (in real app, user would receive via email)
        const codeRecord = await env.DB.prepare(`
          SELECT code FROM verification_codes WHERE email = ? AND used = 0
        `).bind(email).first()

        const response = await app.request('/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: codeRecord.code })
        }, env)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.user.email).toBe(email)
        expect(data.session.token).toBeTruthy()

        // Should set session cookie
        const setCookieHeader = response.headers.get('Set-Cookie')
        expect(setCookieHeader).toContain('session=')
      })

      it('should reject invalid code', async () => {
        const email = 'test@example.com'
        
        // Send code first
        await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }, env)

        const response = await app.request('/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: '000000' })
        }, env)

        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toContain('Invalid or expired')
      })

      it('should reject missing parameters', async () => {
        const response = await app.request('/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }) // Missing code
        }, env)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('required')
      })
    })

    describe('GET /auth/me', () => {
      it('should return user info for authenticated user', async () => {
        const user = await createTestUser(env.DB)
        const session = await createTestSession(env.DB, user.id)

        const response = await app.request('/auth/me', {
          method: 'GET',
          headers: { 'Cookie': `session=${session.token}` }
        }, { ...env, auth: { userId: user.id, user, session } })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.user.id).toBe(user.id)
        expect(data.user.email).toBe(user.email)
      })

      it('should return 401 for unauthenticated request', async () => {
        const response = await app.request('/auth/me', {
          method: 'GET'
        }, env)

        expect(response.status).toBe(401)
      })

      it('should return 401 for invalid session', async () => {
        const response = await app.request('/auth/me', {
          method: 'GET',
          headers: { 'Cookie': 'session=invalid-token' }
        }, env)

        expect(response.status).toBe(401)
      })
    })

    describe('POST /auth/logout', () => {
      it('should logout authenticated user', async () => {
        const user = await createTestUser(env.DB)
        const session = await createTestSession(env.DB, user.id)

        const response = await app.request('/auth/logout', {
          method: 'POST',
          headers: { 'Cookie': `session=${session.token}` }
        }, { ...env, auth: { userId: user.id, user, session } })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)

        // Session should be deleted
        const deletedSession = await env.DB.prepare(`
          SELECT * FROM user_sessions WHERE token = ?
        `).bind(session.token).first()
        
        expect(deletedSession).toBeFalsy()

        // Should clear session cookie
        const setCookieHeader = response.headers.get('Set-Cookie')
        expect(setCookieHeader).toContain('Max-Age=0')
      })

      it('should handle logout without session gracefully', async () => {
        const response = await app.request('/auth/logout', {
          method: 'POST'
        }, env)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      })
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      const email = 'integration@example.com'

      // Step 1: Send verification code
      const sendResponse = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }, env)

      expect(sendResponse.status).toBe(200)

      // Step 2: Get code from database (simulating email delivery)
      const codeRecord = await env.DB.prepare(`
        SELECT code FROM verification_codes WHERE email = ? AND used = 0
      `).bind(email).first()

      // Step 3: Verify code
      const verifyResponse = await app.request('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeRecord.code })
      }, env)

      expect(verifyResponse.status).toBe(200)
      const verifyData = await verifyResponse.json()
      const sessionToken = verifyData.session.token

      // Step 4: Access protected resource
      const meResponse = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Cookie': `session=${sessionToken}` }
      }, { ...env, auth: { userId: verifyData.user.id, user: verifyData.user, session: verifyData.session } })

      expect(meResponse.status).toBe(200)
      const meData = await meResponse.json()
      expect(meData.user.email).toBe(email)

      // Step 5: Logout
      const logoutResponse = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Cookie': `session=${sessionToken}` }
      }, { ...env, auth: { userId: verifyData.user.id, user: verifyData.user, session: verifyData.session } })

      expect(logoutResponse.status).toBe(200)

      // Step 6: Verify session is invalidated
      const finalMeResponse = await app.request('/auth/me', {
        method: 'GET',
        headers: { 'Cookie': `session=${sessionToken}` }
      }, env)

      expect(finalMeResponse.status).toBe(401)
    })

    it('should handle concurrent login attempts', async () => {
      const email = 'concurrent@example.com'

      // Send multiple codes quickly
      const promises = []
      for (let i = 0; i < 3; i++) {
        promises.push(
          app.request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          }, env)
        )
      }

      const responses = await Promise.all(promises)
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Only the last code should be valid
      const codes = await env.DB.prepare(`
        SELECT code, used FROM verification_codes WHERE email = ? ORDER BY createdAt DESC
      `).bind(email).all()

      expect(codes.results).toHaveLength(3)
      expect(codes.results[0].used).toBe(0) // Latest should be unused
      expect(codes.results[1].used).toBe(1) // Previous should be marked as used
      expect(codes.results[2].used).toBe(1) // Previous should be marked as used
    })
  })
})