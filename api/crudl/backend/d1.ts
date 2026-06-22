import * as defaultConfig from '../../public.config'

// CRUDL Interfaces
export interface Item {
  type: string
  id: string
  parentType?: string
  parentId?: string
  data?: ItemData
  meta?: ItemMeta
  user?: string
}

export interface ItemData {
  [key: string]: any
}

export interface ItemMeta {
  createdAt: string
  updatedAt: string
  version: number
  [key: string]: any // Allow for other meta fields
}

export interface QueryResponse {
  items: Item[]
  nextCursor?: string | number
}

export interface QueryOptions {
  limit?: number
  nextCursor?: string | number
  user?: string
}

// Internal interface for the raw DB row structure
interface DBItem {
  type: string
  id: string
  parentType: string | null
  parentId: string | null
  data: string | null // Stored as JSON string
  meta: string | null // Stored as JSON string
  user: string | null
  createdAt: string // ISO string
  updatedAt: string // ISO string
  version: number
}

/**
 * Configuration for public (unauthenticated) access to CRUDL items.
 * Used to control which items/types are accessible without authentication.
 */
export interface PublicConfig {
  // Object with keys for types, values are arrays of allowed ids in that type
  publicItems: Record<string, string[]>
  // Array of item types that can be listed publicly
  publicTypes: string[]
  // Array of child item types that can be listed publicly
  publicChildTypes: string[]
}

// Global DB and table configuration
// These should be initialized in your main server file before calling any CRUDL functions.
let db: D1Database
let tableName: string
let publicConfig: PublicConfig = defaultConfig

/**
 * Initializes the CRUDL helper with a database instance.
 * IMPORTANT: This function must be called once per request with the D1 database
 * binding from the worker's environment before any other CRUDL functions are used.
 * Example in a Hono route handler: `initializeCrudl(c.env.DB)`
 * @param database The D1Database instance to use for all operations.
 * @param table The table name to use (defaults to 'crudl_items').
 * @param config Optional public config to override defaults for testing.
 */
export function initializeCrudl(
  database: D1Database,
  table = 'crudl_items',
  config?: Partial<PublicConfig>
) {
  if(database) {
    db = database
    tableName = table
  }
  if (config) {
    publicConfig = { ...defaultConfig, ...config }
  }
}

// Helper to transform a DB row to the public Item interface
function transformDBItemToItem(dbItem: DBItem): Item {
  const item: Item = {
    type: dbItem.type,
    id: dbItem.id,
  }

  if (dbItem.parentType) item.parentType = dbItem.parentType
  if (dbItem.parentId) item.parentId = dbItem.parentId
  if (dbItem.user) item.user = dbItem.user

  try {
    if (dbItem.data) item.data = JSON.parse(dbItem.data)
  } catch (e) {
    console.error('Failed to parse data JSON for item', dbItem.id, e)
    item.data = {}
  }

  const meta: ItemMeta = {
    createdAt: dbItem.createdAt,
    updatedAt: dbItem.updatedAt,
    version: dbItem.version,
  }

  try {
    if (dbItem.meta) {
      const userMeta = JSON.parse(dbItem.meta)
      Object.assign(meta, userMeta)
    }
  } catch (e) {
    console.error('Failed to parse meta JSON for item', dbItem.id, e)
  }

  item.meta = meta
  return item
}

// --- Server-side helper functions ---

export async function createItem(
  item: Partial<Item> & { type: string },
): Promise<Item> {
  return createUserItem(item?.user, item)
}
export async function createUserItem(
  user: string | null,
  item: Partial<Item> & { type: string },
): Promise<Item> {
  if (!item.type) {
    throw new Error("Create Item request must have a 'type' property.")
  }
  const id = item.id || crypto.randomUUID()
  const now = new Date().toISOString()
  const version = 1

  const { meta: userMeta, data, ...rest } = item

  const stmt = db.prepare(`
    INSERT INTO ${tableName} (type, id, parentType, parentId, data, meta, user, createdAt, updatedAt, version)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
  `).bind(
    item.type,
    id,
    item.parentType || null,
    item.parentId || null,
    JSON.stringify(data || {}),
    JSON.stringify(userMeta || {}),
    user || 'anonymous',
    now,
    now,
    version
  )

  // TODO check status of stmt.run ???
  await stmt.run()

  // Return the created item by fetching it from the DB to ensure correct format
  const createdItem = await readUserItem(user, item.type, id)
  if (!createdItem) {
    throw new Error(`Failed to create and then retrieve item ${item.type}/${id}`)
  }
  return createdItem
}

export async function readPublicItem(
  type: string,
  id: string
): Promise<Item | null> {
  // Allow access if:
  // 1. The specific item id is listed under its type in publicItems
  // 2. The type is in publicTypes (all items of this type are publicly listable)
  // 3. The type is in publicChildTypes (all items of this type are publicly listable as children)
  const isExplicitlyPublic =
    Object.hasOwn(publicConfig.publicItems, type) &&
    publicConfig.publicItems[type]?.includes(id)
  const isPublicType = publicConfig.publicTypes.includes(type)
  const isPublicChildType = publicConfig.publicChildTypes.includes(type)

  if (!isExplicitlyPublic && !isPublicType && !isPublicChildType) {
    //throw new Error(`Forbidden: You don't have permissions to access item ${type}/${id}`)
    return null
  }

  const response = await readItem(type, id)
  if(!response) return null
  const { user, ...strippedItem } = response
  return strippedItem
}
export async function readItem(
  type: string,
  id: string
): Promise<Item | null> {
  return readUserItem(null, type, id)
}
export async function readUserItem(
  user: string | null,
  type: string,
  id: string
): Promise<Item | null> {
  // Query without user filter first to check existence
  const query = `SELECT * FROM ${tableName} WHERE type = ?1 AND id = ?2`
  const stmt = db.prepare(query).bind(type, id)
  const result = await stmt.first<DBItem>()

  if (!result) {
    // Item truly doesn't exist
    return null
  }

  // If user is provided, check ownership
  if (user && result.user !== user) {
    throw new Error(`Forbidden: You don't have permissions to access item ${type}/${id}`)
  }

  return transformDBItemToItem(result)
}

export async function upsertItem(
  type: string,
  id: string,
  item: Partial<Item>
): Promise<Item> {
  return upsertUserItem(item?.user, type, id, item)
}
export async function upsertUserItem(
  user: string | null,
  type: string,
  id: string,
  item: Partial<Item>
): Promise<Item> {
  // Check if the item exists
  const current = await readUserItem(user, type, id)

  if (current) {
    // Update existing item
    return updateUserItem(user, type, id, item)
  } else {
    // Create new item
    return createUserItem(user, { ...item, type, id })
  }
}

export async function updateItem(
  type: string,
  id: string,
  item: Partial<Item>
): Promise<Item> {
  return updateUserItem(null, type, id, item)
}
// Updates all fields of an item (not just data)
export async function updateUserItem(
  user: string | null,
  type: string,
  id: string,
  item: Partial<Item>
): Promise<Item> {
  // Verify ownership by reading with user scope
  const current = await readUserItem(user, type, id)
  if (!current) {
    throw new Error(`Item not found: ${type}/${id}`)
  }

  const now = new Date().toISOString()
  const version = (current.meta?.version || 0) + 1
  const createdAt = current.meta?.createdAt || now // should this incldue the `now` or not?!

  const { meta: userMeta, data, ...rest } = item

  const baseMeta = current.meta || {}
  const mergedMeta = { ...baseMeta, ...userMeta }
  const updatedMeta = {
    ...mergedMeta,
    createdAt,
    updatedAt: now,
    version,
  }

  const stmt = db.prepare(`
    UPDATE ${tableName}
    SET parentType = ?1, parentId = ?2, data = ?3, meta = ?4, updatedAt = ?5, version = ?6
    WHERE type = ?7 AND id = ?8
  `).bind(
    item.parentType !== undefined ? item.parentType : current.parentType || null,
    item.parentId !== undefined ? item.parentId : current.parentId || null,
    JSON.stringify(data !== undefined ? data : current.data || {}),
    JSON.stringify(updatedMeta),
    now,
    version,
    type,
    id
  )

  const result = await stmt.run()
  if (!result.success || result.changes === 0) {
    throw new Error(`Failed to update item: ${type}/${id}`)
  }

  // Return the updated item by re-fetching to ensure consistency
  const updatedItem = await readUserItem(user, type, id)
  if (!updatedItem) {
    throw new Error(`Failed to update and then retrieve item ${type}/${id}`)
  }
  return updatedItem
}

// Use upsertItem() when changing any additional fields beyond just `data`
export async function updateItemData(
  type: string,
  id: string,
  dataUpdates: ItemData
): Promise<Item> {
  return updateUserItemData(null, type, id, dataUpdates)
}
// User-scoped version of updateItemData.
// Verifies ownership before updating the data field.
export async function updateUserItemData(
  user: string | null,
  type: string,
  id: string,
  dataUpdates: ItemData
): Promise<Item> {
  // Verify ownership by reading with user scope
  const current = await readUserItem(user, type, id)
  if (!current) {
    throw new Error(`Item not found: ${type}/${id}`)
  }

  const now = new Date().toISOString()
  const version = (current.meta?.version || 0) + 1

  const newData = { ...current.data, ...dataUpdates }

  const stmt = db.prepare(`
    UPDATE ${tableName}
    SET data = ?1, updatedAt = ?2, version = ?3
    WHERE type = ?4 AND id = ?5
  `).bind(
    JSON.stringify(newData),
    now,
    version,
    type,
    id
  )

  const result = await stmt.run()
  if (!result.success || result.changes === 0) {
    throw new Error(`Failed to update item: ${type}/${id}`)
  }

  // Return the updated item by re-fetching to ensure consistency
  const updatedItem = await readUserItem(user, type, id)
  if (!updatedItem) {
      throw new Error(`Failed to update and then retrieve item ${type}/${id}`)
  }
  return updatedItem
}

export async function deleteItem(
  type: string,
  id: string
): Promise<void> {
  return deleteUserItem(null, type, id)
}
// User-scoped version of deleteItem.
// If user is null, deletes any item matching type and id.
// If user is provided, only deletes items owned by that user.
export async function deleteUserItem(
  user: string | null,
  type: string,
  id: string
): Promise<void> {
  let query = `DELETE FROM ${tableName} WHERE type = ?1 AND id = ?2`
  const bindings: any[] = [type, id]

  if (user) {
    query += ` AND user = ?3`
    bindings.push(user)
  }

  const stmt = db.prepare(query).bind(...bindings)
  const result = await stmt.run()

  if (!result.success) {
    throw new Error(`Failed to delete item: ${type}/${id}`)
  }

  if (result.changes === 0) {
    throw new Error(`Item not found: ${type}/${id}`)
  }
}

export async function listPublicChildItems(
  parentType: string,
  parentId: string,
  childType: string,
  options?: QueryOptions
): Promise<QueryResponse> {
  if (!publicConfig.publicChildTypes.includes(childType)) {
    //throw new Error(`Forbidden: You don't have permissions to access child items of type ${childType}`)
    return { items: [] }
  }
  const response = await listUserChildItems('all'/*users*/, parentType, parentId, childType, options)
  const strippedItems = response.items.map(item => {
    // strip user for public responses
    const { user, ...rest } = item
    return rest
  })
  return { items: strippedItems, nextCursor: response.nextCursor }
}
export async function listChildItems(
  parentType: string,
  parentId: string,
  childType = 'all',
  options?: QueryOptions
): Promise<QueryResponse> {
  return listUserChildItems('all'/*users*/, parentType, parentId, childType, options)
}
export async function listUserChildItems(
  user: string, // require this so the asUser calls must include it; 'all' is special value
  parentType: string,
  parentId: string,
  childType = 'all',
  options?: QueryOptions
): Promise<QueryResponse> {
  const limit = options?.limit
  const nextCursor = parseInt(options?.nextCursor) || 0

  // Handle limit=0 case and any negative numbers
  if (limit <= 0) {
    return { items: [] }
  }

  let whereClause = 'WHERE parentType = ?1 AND parentId = ?2'
  const bindings: any[] = [parentType, parentId]

  if (childType !== 'all') {
    whereClause += ' AND type = ?3'
    bindings.push(childType)
  }

  if (user && user !== 'all') {
    whereClause += ` AND user = ?${bindings.length + 1}`
    bindings.push(user)
  }

  const orderByClause = 'ORDER BY createdAt DESC, id DESC'

  let query = `
    SELECT * FROM ${tableName}
    ${whereClause}
    ${orderByClause}
  `

  if (typeof limit === 'number') {
    const limitClause = `LIMIT ?${bindings.length + 1} OFFSET ?${bindings.length + 2}`
    query += ` ${limitClause}`
    bindings.push(limit, nextCursor)
  }

  const stmt = db.prepare(query).bind(...bindings)
  // TODO check status of stmt.all ???
  const { results } = await stmt.all<DBItem>()

  let nextCursorValue: number | undefined
  if (typeof limit === 'number' && results.length === limit) {
    nextCursorValue = nextCursor + limit
  }

  return {
    items: results.map(transformDBItemToItem),
    nextCursor: nextCursorValue,
  }
}

export async function listPublicItems(
  type: string,
  options?: QueryOptions
): Promise<QueryResponse> {
  if (!publicConfig.publicTypes.includes(type)) {
    //throw new Error(`Forbidden: You don't have permissions to access items of type ${type}`)
    return { items: [] }
  }
  const response = await listUserItems('all'/*users*/, type, options)
  const strippedItems = response.items.map(item => {
    // strip user for public responses
    const { user, ...rest } = item
    return rest
  })
  return {
    items: strippedItems,
    nextCursor: response.nextCursor
  }
}
export async function listAllItems(
  options?: QueryOptions
): Promise<QueryResponse> {
  const paginationOptions = {
    limit: parseInt(options?.limit),
    nextCursor: parseInt(options?.nextCursor),
  }
  return listAllUserItems('all'/*users*/, paginationOptions)
}
export async function listAllUserItems(
  user = 'all',
  options?: QueryOptions
): Promise<QueryResponse> {
  const paginationOptions = {
    limit: parseInt(options?.limit),
    nextCursor: parseInt(options?.nextCursor),
  }
  return listUserItems(user, 'all'/*types*/, paginationOptions)
}
export async function listItems(
  type = 'all',
  options?: QueryOptions
): Promise<QueryResponse> {
  const paginationOptions = {
    limit: parseInt(options?.limit),
    nextCursor: parseInt(options?.nextCursor),
  }
  return listUserItems(options?.user || 'all'/*users*/, type, paginationOptions)
}
export async function listUserItems(
  user: string, // require this so the asUser calls must include it; 'all' is special value
  type = 'all',
  options?: QueryOptions
): Promise<QueryResponse> {
  const limit = options?.limit
  const nextCursor = parseInt(options?.nextCursor) || 0

  // Handle limit=0 case and any negative numbers
  if (limit <= 0) {
    return { items: [] }
  }

  let whereClause = ''
  const bindings: any[] = []

  if (user && user !== 'all') {
    whereClause = 'WHERE user = ?1'
    bindings.push(user)
  }

  if (type !== 'all') {
    if (whereClause) {
      whereClause += ' AND type = ?' + (bindings.length + 1)
    } else {
      whereClause = 'WHERE type = ?1'
    }
    bindings.push(type)
  }

  const orderByClause = 'ORDER BY createdAt DESC, id DESC'

  let query = `
    SELECT * FROM ${tableName}
    ${whereClause}
    ${orderByClause}
  `

  if (typeof limit === 'number') {
    const limitClause = `LIMIT ?${bindings.length + 1} OFFSET ?${bindings.length + 2}`
    query += ` ${limitClause}`
    bindings.push(limit, nextCursor)
  }

  const stmt = db.prepare(query).bind(...bindings)
  // TODO check status of stmt.all ???
  const { results } = await stmt.all<DBItem>()

  let nextCursorValue: number | undefined
  if (typeof limit === 'number' && results.length === limit) {
    nextCursorValue = nextCursor + limit
  }

  return {
    items: results.map(transformDBItemToItem),
    nextCursor: nextCursorValue,
  }
}
