// Reactive (Pinia Colada) wrappers around the generic CRUDL API re-exported by
// `crudl-client.ts` (which in turn re-exports one of the backend-specific
// modules: e.g. local, AWS DynamoDB, or Cloudflare D1).
//
// !!! REQUIRES PINIA COLADA !!!
// This module imports from `@pinia/colada` which may need to be installed
// via `npm i @pinia/colada` and `main.js` may need to register it.
//
// Cache key conventions (used so mutations can invalidate related queries):
//   read item       -> ['crudl', 'item',     type, id]
//   list children   -> ['crudl', 'children', parentType, parentId, childType ?? 'all', optsKey]
//   list user items -> ['crudl', 'userItems', type ?? 'all', optsKey]
// where `optsKey` is a stable encoding of the relevant QueryOptions fields
// (limit, nextPage, user). `undefined`/absent fields collapse to `null`, so a
// no-options list and an explicitly empty-options list share the same key.
// `invalidateQueries({ key })` does a *prefix* match (unless `exact: true`),
// so invalidating `['crudl']` flushes every CRUDL query, and invalidating
// `['crudl', 'children', pt, pi]` flushes every list for that parent
// regardless of childType / pagination / user.

import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import * as api from './crudl-client'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function toValues<T extends readonly MaybeRefOrGetter<any>[]>(
  ...args: T
): { [K in keyof T]: any } {
  return args.map(toValue) as any
}

function allDefined(...values: MaybeRefOrGetter<any>[]): boolean {
  return values.map(toValue).every((v) => v != null)
}

// Cache key builders (kept as plain arrays for cheap prefix matching).
//
// `optsKey` collapses QueryOptions into a small stable tuple so two lists with
// the same logical options share a cache entry, and an admin cross-user view
// (options.user set) never collides with a same-user view.
function optsKey(options?: api.QueryOptions): readonly unknown[] {
  if (!options) return [null]
  const { limit, nextPage, user } = options
  if (limit == null && nextPage == null && user == null) return [null]
  return [limit ?? null, nextPage ?? null, user ?? null]
}

const READ_KEY = (type: string, id: string): readonly unknown[] => ['crudl', 'item', type, id]
const CHILDREN_KEY = (
  parentType: string,
  parentId: string,
  childType?: string,
  options?: api.QueryOptions
): readonly unknown[] => ['crudl', 'children', parentType, parentId, childType ?? 'all', ...optsKey(options)]
const USER_ITEMS_KEY = (
  type: string,
  options?: api.QueryOptions
): readonly unknown[] => ['crudl', 'userItems', type, ...optsKey(options)]

// =============================================================================
// READS / LISTS
// =============================================================================

/**
 * READ a single item by `type` + `id`.
 *
 * @example
 * const { data: item, isLoading } = readItem('order', orderId)
 */
export function readItem(
  type: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<string>
) {
  return useQuery({
    key: () => READ_KEY(...toValues(type, id)),
    query: () => {
      const [t, i] = toValues(type, id)
      return api.readItem(t, i)
    },
    enabled: () => allDefined(type, id),
  })
}

/**
 * LIST direct children of a parent item, optionally filtered by `childType`
 * (defaults to `'all'`), with reactive `QueryOptions` (limit / nextPage for
 * pagination; admin-only `user` to view another user's children).
 *
 * `options` is part of the cache key, so a paginated view, an admin cross-user
 * view, and an unfiltered view all cache independently.
 *
 * @example
 * const { data } = listChildItems('user', userId, 'order')
 * // data.value is { items, nextPage? }
 *
 * // paginated
 * const { data } = listChildItems('user', userId, 'order', { limit: 20 })
 */
export function listChildItems(
  parentType: MaybeRefOrGetter<string>,
  parentId: MaybeRefOrGetter<string>,
  childType: MaybeRefOrGetter<string | undefined> = undefined,
  options: MaybeRefOrGetter<api.QueryOptions | undefined> = undefined
) {
  return useQuery({
    key: () =>
      CHILDREN_KEY(
        ...toValues(parentType, parentId),
        toValue(childType) ?? 'all',
        toValue(options)
      ),
    query: () => {
      const [pt, pi, ct, opts] = toValues(parentType, parentId, childType, options)
      return api.listChildItems(pt, pi, ct ?? 'all', opts)
    },
    enabled: () => allDefined(parentType, parentId, childType, options),
  })
}

/**
 * LIST items owned by the authenticated user, optionally filtered by `type`
 * (defaults to `'all'`), with reactive `QueryOptions` (limit / nextPage for
 * pagination; admin-only `user` to list another user's items).
 *
 * `options` is part of the cache key, so a paginated view, an admin cross-user
 * view, and an unfiltered view all cache independently.
 *
 * @example
 * const { data } = listUserItems('order')
 */
export function listUserItems(
  type: MaybeRefOrGetter<string | undefined> = undefined,
  options: MaybeRefOrGetter<api.QueryOptions | undefined> = undefined
) {
  return useQuery({
    key: () => USER_ITEMS_KEY(toValue(type) ?? 'all', toValue(options)),
    query: () => api.listUserItems(toValue(type) ?? 'all', toValue(options)),
    enabled: () => allDefined(type, options),
  })
}

// =============================================================================
// WRITES (mutations)
// =============================================================================

/**
 * Toggle this instance to the admin CRUDL endpoints (or, for backends where
 * admin/user is enforced by authN rather than a separate endpoint, set the
 * role flag the backend uses). Only call this from pages gated to users with
 * the admin role.
 *
 * Not reactive — flipping it does not by itself invalidate cached queries.
 * Call `refetchCrudl()` afterward if you need to drop user-scoped caches and
 * reload them under the admin view.
 */
export { makeAdmin } from './crudl-client'

/**
 * CREATE a new item.
 *
 * The mutation variable is a `Partial<Item>` (the same shape accepted by
 * the underlying `createItem`). On success, the new item's parent (if any) has
 * its children list invalidated, and the relevant user-items list(s) are
 * invalidated too.
 *
 * @example
 * const { mutate: create, isPending } = createItem()
 * create({ type: 'demo', data: { text: 'hi' } })
 */
export function createItem() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (item: Partial<api.Item>) => api.createItem(item),
    onSuccess: (created) => {
      if (created.parentType && created.parentId) {
        // Flush this exact parent's children list (and, via prefix match,
        // any `listChildItems` query for the same parent regardless of childType
        // is covered because we invalidate at the parent level too).
        queryCache.invalidateQueries({
          key: ['crudl', 'children', created.parentType, created.parentId],
        })
      }
      // Flush the user-items list(s) for the created type and for 'all'.
      if (created.type) {
        queryCache.invalidateQueries({ key: USER_ITEMS_KEY(created.type) })
      }
      queryCache.invalidateQueries({ key: USER_ITEMS_KEY('all') })
    },
  })
}

/**
 * UPSERT an existing item (field-level update of the Item; `data` is replaced
 * wholesale when provided). See `crudl-client.ts`'s `upsertItem`.
 *
 * The mutation variable is the partial Item to overlay.
 *
 * @example
 * const { mutate: upsert } = upsertItem('order', orderId)
 * upsert({ data: { text: 'new' } })
 */
export function upsertItem(
  type: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<string>
) {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (item: Partial<api.Item>) => {
      const [t, i] = toValues(type, id)
      return api.upsertItem(t, i, item)
    },
    onSuccess: (updated) => {
      const [t, i] = toValues(type, id)
      const key = READ_KEY(t, i)

      // Optimistically splice the updated item into the read cache so the UI
      // updates before any background refetch completes.
      queryCache.setQueryData<api.Item>(key, updated)

      // Invalidate the read entry + any list that might contain it.
      queryCache.invalidateQueries({ key })
      if (updated.parentType && updated.parentId) {
        queryCache.invalidateQueries({
          key: ['crudl', 'children', updated.parentType, updated.parentId],
        })
      }
      if (updated.type) {
        queryCache.invalidateQueries({ key: USER_ITEMS_KEY(updated.type) })
      }
      queryCache.invalidateQueries({ key: USER_ITEMS_KEY('all') })
    },
  })
}

/**
 * UPDATE just the `data` field of an existing item (merge into `data`). See
 * `crudl-client.ts`'s `updateItemData`.
 *
 * The mutation variable is the `ItemData` (partial data object) to merge in.
 *
 * @example
 * const { mutate: patch } = updateItemData('order', orderId)
 * patch({ status: 'complete' })
 */
export function updateItemData(
  type: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<string>
) {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (dataUpdates: api.ItemData) => {
      const [t, i] = toValues(type, id)
      return api.updateItemData(t, i, dataUpdates)
    },
    onSuccess: (updated) => {
      const [t, i] = toValues(type, id)
      const key = READ_KEY(t, i)

      queryCache.setQueryData<api.Item>(key, updated)
      queryCache.invalidateQueries({ key })
      if (updated.parentType && updated.parentId) {
        queryCache.invalidateQueries({
          key: ['crudl', 'children', updated.parentType, updated.parentId],
        })
      }
      if (updated.type) {
        queryCache.invalidateQueries({ key: USER_ITEMS_KEY(updated.type) })
      }
      queryCache.invalidateQueries({ key: USER_ITEMS_KEY('all') })
    },
  })
}

/**
 * DELETE an item by `type` + `id`.
 *
 * The mutation variable is optional (ignored) — type/id come from setup.
 *
 * @example
 * const { mutate: remove } = deleteItem('order', orderId)
 * remove()
 */
export function deleteItem(
  type: MaybeRefOrGetter<string>,
  id: MaybeRefOrGetter<string>,
  // Optional parent context so we can invalidate the right children list even
  // after the item itself is gone (the read key will no longer resolve).
  // TODO can we pull the parent type+id from the returned value (what had been deleted)?
  parentType: MaybeRefOrGetter<string | undefined> = undefined,
  parentId: MaybeRefOrGetter<string | undefined> = undefined
) {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: () => {
      const [t, i] = toValues(type, id)
      return api.deleteItem(t, i)
    },
    onSuccess: () => {
      const [t, i] = toValues(type, id)
      const [pt, pi] = toValues(parentType, parentId)

      // Drop the read entry (it no longer exists).
      queryCache.invalidateQueries({ key: READ_KEY(t, i) })
      // Flush the parent's children list if known.
      if (pt && pi) {
        queryCache.invalidateQueries({ key: ['crudl', 'children', pt, pi] })
      }
      // Flush user-items list(s) for this type and for 'all'.
      queryCache.invalidateQueries({ key: USER_ITEMS_KEY(t) })
      queryCache.invalidateQueries({ key: USER_ITEMS_KEY('all') })
    },
  })
}

// =============================================================================
// ESCAPE HATCH
// =============================================================================

/**
 * Eagerly invalidate (and refetch active) CRUDL queries. Pass no args to
 * flush everything, or a partial key to flush a subset.
 *
 * @example
 * refetchCrudl()                                  // flush all
 * refetchCrudl(['crudl', 'children', 'user', uid]) // flush one parent's lists
 */
export function refetchCrudl(key: readonly unknown[] = ['crudl']) {
  const queryCache = useQueryCache()
  queryCache.invalidateQueries({ key })
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*

import { ref, computed } from 'vue'

// Read a single item
const orderId = ref('order-123')
const { data: order, isLoading } = readItem('order', orderId)

// List children (reactive parent id)
const userId = ref('user-1')
const { data: orders } = listChildItems('user', computed(() => userId.value), 'order')
// orders.value is { items, nextPage? }

// Paginated children (nextPage from a prior QueryResponse)
const { data: moreOrders } = listChildItems('user', userId, 'order', { nextPage: orders.value?.nextPage, limit: 20 })

// Admin view of another user's children (only on admin-gated pages; call makeAdmin() first if the backend uses separate endpoints)
const { data: theirOrders } = listChildItems('user', targetUserId, 'order', { user: targetUserId })

// List everything owned by the user
const { data: mine } = listUserItems()           // -> all types
const { data: myOrders } = listUserItems('order')

// Create
const { mutate: create, isPending } = createItem()
create({ type: 'order', parentType: 'user', parentId: userId.value, data: { total: 100 } })

// Upsert whole Item fields
const { mutate: upsert } = upsertItem('order', orderId)
upsert({ data: { total: 150 } })            // replaces `data` wholesale

// Patch just the data
const { mutate: patch } = updateItemData('order', orderId)
patch({ status: 'complete' })                // merges into `data`

// Delete (optionally pass parent context for smarter invalidation)
const { mutate: remove } = deleteItem('order', orderId, 'user', userId)
remove()

// Switch instance to admin endpoints (admin-gated pages only), then drop any
// user-scoped caches so reads reload under the admin view.
makeAdmin()
refetchCrudl()

*/
