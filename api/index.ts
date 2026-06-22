import { Hono, Context, Next } from 'hono'
import crudlPublicRoutes from './crudl/asPublic'
import crudlUserRoutes from './crudl/asUser'
import crudlAdminRoutes from './crudl/asAdmin'
import { auth } from '../lib/auth'

// Create the main Hono application instance
const app = new Hono()

/**
 * Authentication Middleware
 * 
 * This middleware intercepts requests, validates the user's session using Better Auth,
 * and attaches the user and session objects to the Hono context.
 * If no valid session is found, it allows the request to proceed without setting the context variables.
 */
const authMiddleware = async (c: Context, next: Next) => {
  try {
    // Use the Better Auth server API to get the session.
    // We pass the request headers so it can read the session cookie.
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (sessionData?.user && sessionData?.session) {
      // If a valid session exists, attach the user and session to the context.
      // This makes them available in downstream route handlers via `c.get('user')`.
      c.set('user', sessionData.user)
      c.set('session', sessionData.session)
    }
  } catch (error) {
    // Log any errors during session validation, but don't block the request.
    // The route handler itself is responsible for checking if a user is authenticated.
    console.error('Auth middleware error:', error)
  }

  await next()
}

/**
 * AuthN Middleware
 * Ensures the user is authenticated.
 */
const authNMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user) {
    return c.text('Unauthorized', 401)
  }
  await next()
}

/**
 * AuthZAdmin Middleware
 * Ensures the user is authenticated and has the 'admin' role.
 */
const authZAdminMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user) {
    return c.text('Unauthorized', 401)
  }

  // user.role is a comma-delimited string (e.g., "user,admin")
  const roles = user.role ? user.role.split(',').map((r: string) => r.trim()) : []
  
  if (!roles.includes('admin')) {
    return c.text('Forbidden', 403)
  }

  await next()
}

// Apply the authentication middleware to the API routes
// This attempts to set user&session for all endpoints under `/api` but doesn't do any actual protection of the routes
app.use('/api/*', authMiddleware)

// Apply no auth protection to public routes
app.route('/api/v3/public/items', crudlPublicRoutes)

// Apply AuthN protection to user routes
app.use('/api/v3/items/*', authNMiddleware)
app.route('/api/v3/items', crudlUserRoutes)

// Apply AuthZAdmin protection to admin routes
app.use('/api/v3/admin/*', authZAdminMiddleware)
app.route('/api/v3/admin/items', crudlAdminRoutes)

// The Better Auth handler for authentication actions (sign-in, sign-up, etc.).
// This route must remain public and should NOT be protected by the authMiddleware.
app.on(
  ['GET', 'POST'],
  '/api/auth/*',
  (c) => auth.handler(c.req.raw)
)

// Health check route (public)
app.get('/api/v3/public/health', (c) => {
  return c.json({
    timestamp: new Date().toISOString(),
    env: c.env || 'testing',
  })
})

// Health check route
app.get('/api/v3/health', (c) => {
  const user = c.get('user')
  const session = c.get('session')
  const now = new Date().toISOString()

  if (!user || !session) {
    // This case should ideally not be reached if the middleware is working correctly,
    // but it serves as a fallback.
    return c.text(`${now}: Unauthorized ${user} ${session}`, 401)
  }

  return c.json({
    timestamp: now,
    status: 'ok',
    message: 'You are authenticated.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    session: {
      id: session.id,
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
  })
})


// Export the app to be used by the Cloudflare Worker entrypoint
export default app
