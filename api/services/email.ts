// Email service using Mailjet for VFF Cloudflare Backend
// Handles sending verification codes and other transactional emails

export interface EmailConfig {
  apiKey: string
  secretKey: string
  fromEmail: string
  fromName: string
}

export interface SendEmailOptions {
  to: string
  subject: string
  htmlContent: string
  textContent?: string
}

export class EmailService {
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const subject = 'Your VFF Verification Code'
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px;">${code}</span>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated message from VFF Application.</p>
      </div>
    `
    const textContent = `Your VFF verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`

    return this.sendEmail({
      to: email,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
    const displayName = name || email
    const subject = 'Welcome to VFF!'
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to VFF!</h2>
        <p>Hi ${displayName},</p>
        <p>Welcome to VFF! Your account has been successfully created.</p>
        <p>You can now start using the application to manage your projects and tasks.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated message from VFF Application.</p>
      </div>
    `
    const textContent = `Hi ${displayName},\n\nWelcome to VFF! Your account has been successfully created.\n\nYou can now start using the application to manage your projects and tasks.`

    return this.sendEmail({
      to: email,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * Generic email sending method - uses console logging for development
   */
  private async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      // For development/demo purposes, log the email instead of sending
      console.log('📧 EMAIL WOULD BE SENT:')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('Text Content:', options.textContent || this.stripHtml(options.htmlContent))
      console.log('---')
      
      // In production, you would uncomment the actual email sending code below
      // and comment out the console.log statements above
      
      /*
      // Check if we have valid API credentials
      if (!this.config.apiKey || !this.config.secretKey) {
        console.log('⚠️  No email credentials configured, using console logging for demo')
        return true
      }

      const auth = btoa(`${this.config.apiKey}:${this.config.secretKey}`)
      
      const payload = {
        Messages: [
          {
            From: {
              Email: this.config.fromEmail,
              Name: this.config.fromName
            },
            To: [
              {
                Email: options.to
              }
            ],
            Subject: options.subject,
            HTMLPart: options.htmlContent,
            TextPart: options.textContent || this.stripHtml(options.htmlContent)
          }
        ]
      }

      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Mailjet API error:', response.status, errorText)
        return false
      }

      const result = await response.json()
      console.log('Email sent successfully:', result)
      */
      
      return true

    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  /**
   * Strip HTML tags for text content fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

/**
 * Create email service instance from environment variables
 */
export function createEmailService(env: any): EmailService {
  return new EmailService({
    apiKey: env.MAILJET_API_KEY,
    secretKey: env.MAILJET_SECRET_KEY,
    fromEmail: env.FROM_EMAIL,
    fromName: env.FROM_NAME
  })
}