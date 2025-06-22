// OpenAuth integration for VFF Cloudflare Backend
// This file replaces the old AWS Cognito implementation

import { createAuthService } from './services/auth'
import { createEmailService } from './services/email'

/**
 * OpenAuth configuration and utilities
 * This replaces the AWS Cognito preSignUpApprove function
 */

export interface OpenAuthConfig {
  emailConfig: {
    apiKey: string
    secretKey: string
    fromEmail: string
    fromName: string
  }
}

/**
 * Initialize OpenAuth services
 */
export function initializeOpenAuth(db: any, config: OpenAuthConfig) {
  const emailService = createEmailService({
    apiKey: config.emailConfig.apiKey,
    secretKey: config.emailConfig.secretKey,
    fromEmail: config.emailConfig.fromEmail,
    fromName: config.emailConfig.fromName
  })

  const authService = createAuthService(db, emailService)

  return {
    emailService,
    authService
  }
}

/**
 * Utility functions for OpenAuth integration
 */
export const OpenAuthUtils = {
  /**
   * Generate verification code (6 digits)
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  },

  /**
   * Generate session token
   */
  generateSessionToken(): string {
    return crypto.randomUUID() + '-' + Date.now().toString(36)
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Validate verification code format
   */
  isValidCode(code: string): boolean {
    return /^\d{6}$/.test(code)
  },

  /**
   * Create session expiry date (30 days from now)
   */
  createSessionExpiry(): Date {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },

  /**
   * Create verification code expiry date (10 minutes from now)
   */
  createCodeExpiry(): Date {
    return new Date(Date.now() + 10 * 60 * 1000)
  }
}

/**
 * Migration notes from AWS Cognito:
 * 
 * OLD (AWS Cognito):
 * - preSignUpApprove function auto-confirmed users
 * - Used Cognito User Pools for user management
 * - JWT tokens were managed by AWS
 * - Email verification was handled by Cognito
 * 
 * NEW (OpenAuth):
 * - Email-based code verification system
 * - Custom user management in D1 database
 * - Session-based authentication with custom tokens
 * - Mailjet for email delivery
 * - More control over the authentication flow
 */

export default {
  initializeOpenAuth,
  OpenAuthUtils
}
