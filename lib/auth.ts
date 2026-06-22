import { betterAuth, type BetterAuthOptions } from "better-auth"
import { admin } from "better-auth/plugins"
import { emailOTP } from "better-auth/plugins"
import { drizzle } from "drizzle-orm/d1"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import * as schema from "../lib/auth-schema"
import { env } from 'cloudflare:workers'
import { waitUntil } from 'cloudflare:workers'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret:  env.BETTER_AUTH_SECRET,
  plugins: [
    admin(),
    emailOTP({
      expiresIn: 900, // 15 minutes
      otpLength: 6,
      sendVerificationOTP: async ({ email, otp, type }) => {
        //console.log("OTP for", email, type, otp)
        void sendEmail({
          to: email,
        subject: "Your <SITE> login code",
          text: `Your login code is ${otp}`,
        })
      },
    }),
  ],
  database: drizzleAdapter(
    drizzle(env.DB, { schema, logger: true }),
    {
      provider: "sqlite", // D1
      usePlural: true,
      //debugLogs: true,
    }
  ),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
      strategy: "jwt" // "compact" or "jwt" or "jwe"
    },
  },
//  socialProviders: {
//    google: {
//      clientId: env.GOOGLE_CLIENT_ID as string,
//      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
//    },
//  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({user, url, token}, request) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      })
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`)
    },
  },
  emailVerification: {
    sendVerificationEmail: async ( { user, url, token }, request) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      })
    },
  },
})

async function sendEmail(opts: { to: string; subject: string; text: string }) {
  console.log("sendEmail", opts)
}
async function sendEmailMailJet(opts: { to: string; subject: string; text: string }) {
  if(!env.MAILJET_API_KEY || !env.MAILJET_API_SECRET) {
    console.log("sendEmail", opts)
    return
  }

  const auth = btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_API_SECRET}`);

  const request = fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: env.MAILJET_SENDER_EMAIL || 'noreply@<SITE>',
            Name:  env.MAILJET_SENDER_NAME  || '<SITE>',
          },
          To: [
            {
              Email: opts.to,
            },
          ],
          Subject: opts.subject,
          TextPart: opts.text,
        },
      ],
    }),
  })
  waitUntil(request) // tell Cloudflare Worker to wait for the promise to resolve (or 30 seconds)
  const response = await request

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send email via MailJet:', error);
    throw new Error(`Failed to send email: ${error}`);
  }
}
