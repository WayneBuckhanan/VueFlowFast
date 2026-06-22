import { Hono } from 'hono'
import type { Item, QueryResponse } from './backend'
import {
  createItem,
  readItem,
  upsertItem,
  updateItemData,
  deleteItem,
  listChildItems,
  listItems,
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
const parsePaginationQueryOptions = (c: any) => {
  const limit = parseInt(c.req.query('limit') || '50', 10)
  const nextCursor = c.req.query('nextCursor') || undefined
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
 * Creates a new item.
 * POST /{type}
 */
crudl.post('/:type', async (c) => {
  const type = c.req.param('type')
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }
  const user = body?.user || c.get('user')?.id // should we just throw an error instead of assigning it to the logged in (admin) user or being null?
  const itemData = { ...body, type, user }

  const result = await createItem(itemData)
  return c.json(result, 201)
})

/**
 * Reads a single item by its type and ID.
 * GET /{type}/{id}
 */
crudl.get('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  const result = await readItem(type, id)
  if (!result) {
    throw new Error(`Item not found: ${type}/${id}`)
  }
  return c.json(result, 200)
})

/**
 * Upserts an item (creates if it doesn't exist, updates if it does).
 * PUT /{type}/{id}
 */
crudl.put('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  const body = await c.req.json()
  const user = c.req.query('user') || body?.user || undefined // since this is authZ locked, allow the query param to override the user field in the body
  const newItem = { ...body, type, user }
  const result = await upsertItem(type, id, newItem)
  return c.json(result, 200)
})

/**
 * Updates an item's data field.
 * PATCH /{type}/{id}
 * Expects a request body of an object to merge with the 'data' field
 */
crudl.patch('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    return c.json({ error: 'Invalid JSON request body' }, 400)
  }
  const result = await updateItemData(type, id, body)
  return c.json(result, 200)
})

/**
 * Deletes an item.
 * DELETE /{type}/{id}
 */
crudl.delete('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  await deleteItem(type, id)
  return c.body(null, 204)
})

/**
 * Lists child items of a parent.
 * GET /{parentType}/{parentId}/{childType}
 */
crudl.get('/:parentType/:parentId/:childType', async (c) => {
  const { parentType, parentId, childType } = c.req.param()
  const pageOptions = parsePaginationQueryOptions(c)
  const user = c.req.query('user') || null
  const result = await listChildItems(parentType, parentId, childType, {...pageOptions, user})
  return c.json(result, 200)
})

/**
 * Lists items for the options.user or all if missing.
 * GET /{type}
 */
crudl.get('/:type', async (c) => {
  const type = c.req.param('type')
  const pageOptions = parsePaginationQueryOptions(c)
  const user = c.req.query('user') || null
  const result = await listItems(type, {...pageOptions, user})
  return c.json(result, 200)
})

export default crudl
