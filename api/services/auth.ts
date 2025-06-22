// Authentication service for VFF Cloudflare Backend
// Handles user authentication, sessions, and verification codes

import { EmailService } from './email'

// Cloudflare D1 Database type
type D1Database = any

export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface UserSession {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}

export interface VerificationCode {
  id: string
  email: string
  code: string
  expiresAt: string
  createdAt: string
  used: boolean
}

export interface AuthResult {
  success: boolean
  user?: User
  session?: UserSession
  error?: string
}

export class AuthService {
  private db: D1Database
  private emailService: EmailService
  private static codeCounter = 0

  constructor(db: D1Database, emailService: EmailService) {
    this.db = db
    this.emailService = emailService
  }

  /**
   * Generate a 6-digit verification code
   */
  async generateVerificationCode(email: string): Promise<string> {
    let code: string
    let attempts = 0
    const maxAttempts = 100
    
    // Increment global counter for uniqueness
    AuthService.codeCounter = (AuthService.codeCounter + 1) % 1000000
    
    do {
      // Use multiple sources of entropy for maximum randomness
      const randomArray = new Uint32Array(4)
      crypto.getRandomValues(randomArray)
      
      // Create a unique seed combining multiple entropy sources
      const timestamp = Date.now()
      const performanceNow = performance.now()
      const emailHash = this.simpleHash(email + timestamp + AuthService.codeCounter)
      
      // Combine all entropy sources with XOR and addition for better distribution
      const entropy = randomArray[0] ^ randomArray[1] ^ randomArray[2] ^ randomArray[3]
      const seed = entropy + Math.floor(performanceNow * 1000) + emailHash + attempts + AuthService.codeCounter
      
      // Use a more robust modulo operation to ensure 6-digit range
      code = (Math.abs(seed) % 900000 + 100000).toString()
      attempts++
      
      // Check if this code already exists for this email
      const existingCode = await this.db.prepare(`
        SELECT id FROM verification_codes
        WHERE email = ? AND code = ?
        LIMIT 1
      `).bind(email, code).first()
      
      if (!existingCode) {
        break // Code is unique for this email
      }
      
      // Add a small random delay to prevent timing attacks and ensure entropy changes
      const delay = Math.floor(Math.random() * 5) + 1
      await new Promise(resolve => setTimeout(resolve, delay))
    } while (attempts < maxAttempts)
    
    if (attempts >= maxAttempts) {
      // Final fallback: use UUID hash with additional entropy
      const uuid1 = crypto.randomUUID().replace(/-/g, '')
      const uuid2 = crypto.randomUUID().replace(/-/g, '')
      const hash = parseInt(uuid1.substring(0, 8), 16) ^ parseInt(uuid2.substring(0, 8), 16) ^ AuthService.codeCounter
      code = (Math.abs(hash) % 900000 + 100000).toString()
    }
    
    return code
  }

  /**
   * Simple hash function for additional entropy
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Generate a secure session token
   */
  generateSessionToken(): string {
    return crypto.randomUUID() + '-' + Date.now().toString(36)
  }

  /**
   * Send verification code to email
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = email.toLowerCase()
      
      // Generate new verification code
      const code = await this.generateVerificationCode(normalizedEmail)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      const createdAt = new Date().toISOString()
      const id = crypto.randomUUID()
      
      // Use a transaction to ensure atomicity - mark existing codes as used and insert new code
      const batch = [
        // First mark all existing codes for this email as used
        this.db.prepare(`
          UPDATE verification_codes
          SET used = 1
          WHERE email = ? AND used = 0
        `).bind(normalizedEmail),
        
        // Then insert the new verification code
        this.db.prepare(`
          INSERT INTO verification_codes (id, email, code, expiresAt, createdAt, used)
          VALUES (?, ?, ?, ?, ?, 0)
        `).bind(id, normalizedEmail, code, expiresAt.toISOString(), createdAt)
      ]

      await this.db.batch(batch)

      // Send email
      const emailSent = await this.emailService.sendVerificationCode(email, code)
      
      if (!emailSent) {
        return { success: false, error: 'Failed to send verification email' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error sending verification code:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Verify code (without creating session)
   */
  async verifyCode(email: string, code: string): Promise<AuthResult> {
    try {
      const normalizedEmail = email.toLowerCase()

      // Find valid verification code
      const codeStmt = this.db.prepare(`
        SELECT * FROM verification_codes
        WHERE email = ? AND code = ? AND used = FALSE AND expiresAt > datetime('now')
        ORDER BY createdAt DESC
        LIMIT 1
      `)
      const verificationRecord = await codeStmt.bind(normalizedEmail, code).first()

      if (!verificationRecord) {
        return { success: false, error: 'Invalid or expired verification code' }
      }

      // Mark code as used
      const markUsedStmt = this.db.prepare(`
        UPDATE verification_codes SET used = TRUE WHERE id = ?
      `)
      await markUsedStmt.bind(verificationRecord.id).run()

      // Find or create user
      let user = await this.findUserByEmail(normalizedEmail)
      if (!user) {
        user = await this.createUser(normalizedEmail)
      } else {
        // Update last login time
        await this.updateUserLastLogin(user.id)
      }

      return {
        success: true,
        user
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Verify code and create user session
   */
  async verifyCodeAndLogin(email: string, code: string): Promise<AuthResult> {
    try {
      const normalizedEmail = email.toLowerCase()

      // Find valid verification code
      const codeStmt = this.db.prepare(`
        SELECT * FROM verification_codes 
        WHERE email = ? AND code = ? AND used = FALSE AND expiresAt > datetime('now')
        ORDER BY createdAt DESC
        LIMIT 1
      `)
      const verificationRecord = await codeStmt.bind(normalizedEmail, code).first()

      if (!verificationRecord) {
        return { success: false, error: 'Invalid or expired verification code' }
      }

      // Mark code as used
      const markUsedStmt = this.db.prepare(`
        UPDATE verification_codes SET used = TRUE WHERE id = ?
      `)
      await markUsedStmt.bind(verificationRecord.id).run()

      // Find or create user
      let user = await this.findUserByEmail(normalizedEmail)
      if (!user) {
        user = await this.createUser(normalizedEmail)
        // Send welcome email (don't wait for it)
        this.emailService.sendWelcomeEmail(normalizedEmail).catch(console.error)
      } else {
        // Update last login time
        await this.updateUserLastLogin(user.id)
      }

      // Create session
      const session = await this.createSession(user.id)

      return {
        success: true,
        user,
        session
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Validate session token and get user
   */
  async validateSession(token: string): Promise<{valid: boolean, user?: User, session?: UserSession, error?: string}> {
    try {
      const stmt = this.db.prepare(`
        SELECT u.*, s.id as sessionId, s.token, s.expiresAt, s.createdAt as sessionCreatedAt
        FROM users u
        JOIN user_sessions s ON u.id = s.userId
        WHERE s.token = ?
      `)
      const result = await stmt.bind(token).first()

      if (!result) {
        return { valid: false, error: 'Invalid session' }
      }

      // Explicitly check expiration
      const expiresAt = new Date(result.expiresAt)
      if (expiresAt < new Date()) {
        return { valid: false, error: 'Session expired' }
      }

      const user = {
        id: result.id,
        email: result.email,
        name: result.name,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        lastLoginAt: result.lastLoginAt
      }

      const session = {
        id: result.sessionId,
        userId: result.id,
        token: result.token,
        expiresAt: result.expiresAt,
        createdAt: result.sessionCreatedAt
      }

      return { valid: true, user, session }
    } catch (error) {
      console.error('Error validating session:', error)
      return { valid: false, error: 'Internal server error' }
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(token: string): Promise<AuthResult | undefined> {
    try {
      // First check if session exists
      const sessionStmt = this.db.prepare(`
        SELECT 1 FROM user_sessions WHERE token = ?
      `)
      const sessionExists = await sessionStmt.bind(token).first()
      
      if (!sessionExists) {
        return undefined
      }

      // Delete the session
      const deleteStmt = this.db.prepare(`
        DELETE FROM user_sessions WHERE token = ?
      `)
      await deleteStmt.bind(token).run()
      return { success: true }
    } catch (error) {
      console.error('Error logging out:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM users WHERE email = ?
      `)
      const result = await stmt.bind(email).first()

      if (!result) {
        return null
      }

      return {
        id: result.id,
        email: result.email,
        name: result.name,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        lastLoginAt: result.lastLoginAt
      }
    } catch (error) {
      console.error('Error finding user:', error)
      return null
    }
  }

  /**
   * Create new user
   */
  private async createUser(email: string): Promise<User> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `)
    await stmt.bind(id, email, now, now).run()

    return {
      id,
      email,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Update user's last login time
   */
  private async updateUserLastLogin(userId: string): Promise<void> {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      UPDATE users SET lastLoginAt = ?, updatedAt = ? WHERE id = ?
    `)
    await stmt.bind(now, now, userId).run()
  }

  /**
   * Create user session
   */
  private async createSession(userId: string): Promise<UserSession> {
    const id = crypto.randomUUID()
    const token = this.generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    const now = new Date().toISOString()

    // Clean up old sessions for this user (keep only the 5 most recent)
    await this.cleanupOldSessions(userId)

    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (id, userId, token, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `)
    await stmt.bind(id, userId, token, expiresAt.toISOString(), now).run()

    return {
      id,
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: now
    }
  }

  /**
   * Clean up expired verification codes for an email
   */
  private async cleanupExpiredCodes(email: string): Promise<void> {
    // Mark all existing codes for this email as used (invalidate them)
    const markUsedStmt = this.db.prepare(`
      UPDATE verification_codes
      SET used = 1
      WHERE email = ? AND used = 0
    `)
    await markUsedStmt.bind(email).run()
    
    // Only delete expired codes, keep used codes for testing/auditing
    const deleteStmt = this.db.prepare(`
      DELETE FROM verification_codes
      WHERE email = ? AND expiresAt < datetime('now')
    `)
    await deleteStmt.bind(email).run()
  }

  /**
   * Clean up old sessions for a user (keep only 5 most recent)
   */
  private async cleanupOldSessions(userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM user_sessions 
      WHERE userId = ? AND id NOT IN (
        SELECT id FROM user_sessions 
        WHERE userId = ? 
        ORDER BY createdAt DESC 
        LIMIT 5
      )
    `)
    await stmt.bind(userId, userId).run()
  }

  /**
   * Clean up all expired sessions and codes (maintenance function)
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      // Clean up expired sessions
      const sessionsStmt = this.db.prepare(`
        DELETE FROM user_sessions WHERE expiresAt < datetime('now')
      `)
      await sessionsStmt.run()

      // Clean up expired verification codes
      const codesStmt = this.db.prepare(`
        DELETE FROM verification_codes WHERE expiresAt < datetime('now')
      `)
      await codesStmt.run()

      console.log('Expired data cleanup completed')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

/**
 * Create auth service instance
 */
export function createAuthService(db: D1Database, emailService: EmailService): AuthService {
  return new AuthService(db, emailService)
}