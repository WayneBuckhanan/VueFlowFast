import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Item, QueryOptions, QueryResponse } from './backend'
import {
  readPublicItem,
  listPublicItems,
  listPublicChildItems,
  initializeCrudl,
} from './backend'

// Initialize a new Hono router for CRUDL operations
const crudl = new Hono()

// Middleware to initialize the CRUDL helper with the D1 database instance for all requests
crudl.use('*', async (c, next) => {
  initializeCrudl(c.env?.DB) // DB doesn't exist in test env, but initalizeCrudl can handle a falsy value
  await next()
})

/**
 * Helper function to parse and type-cast pagination query parameters.
 * @param c - The Hono context object.
 * @returns An object with parsed limit and nextCursor.
 */
const parsePaginationQueryOptions = (c: Context): QueryOptions => {
  const limit = parseInt(c.req.query('limit') || '50', 10)
  const nextCursor = parseInt(c.req.query('nextCursor') || '0', 10)
  return { limit, nextCursor }
}

// Centralized error handler to format responses consistently
crudl.onError((err, c) => {
  console.error(err)
  if (err.message.includes('not found')) {
    return c.json({ error: err.message }, 404)
  }
  if (err.message.includes('Forbidden')) {
    return c.json({ error: err.message }, 403)
  }
  if (err.message.includes('must have a \'type\'')) {
    return c.json({ error: err.message }, 400)
  }
  // Default to 500 for other server errors
  return c.json({ error: `Internal Server Error: ${err.message}` }, 500)
})

/**
 * Read item if allowed by config for the type+id
 * GET /{type}/{id}
 */
crudl.get('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  const result = await readPublicItem(type, id)
  if (!result) {
    throw new Error(`Item not found: ${type}/${id}`)
  }
  return c.json(result, 200)
})

/**
 * Lists child items of a parent if allowed by config for the childType
 * GET /{parentType}/{parentId}/{childType}
 */
crudl.get('/:parentType/:parentId/:childType', async (c) => {
  const { parentType, parentId, childType } = c.req.param()
  const options = parsePaginationQueryOptions(c)
  const result = await listPublicChildItems(parentType, parentId, childType, options)
  return c.json(result, 200)
})

/**
 * Lists items if allowed by config for the type
 * GET /{type}
 */
crudl.get('/:type', async (c) => {
  const type = c.req.param('type')
  const options = parsePaginationQueryOptions(c)
  const result = await listPublicItems(type, options)
  return c.json(result, 200)
})

export default crudl
