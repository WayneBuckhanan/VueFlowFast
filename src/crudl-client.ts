// Big picture: generic CRUDL API interface
//   - designed for extreme prototyping without knowing what database/storage is backing the API (we have Pinia store, AWS DynamoDB, and Cloudflare D1 versions already, you don't need to know which is deployed)
//   - intentionally flexible for the exploration phase, assumes most sorting/filtering will happen on frontend (prototype scale data, not production)
//   - data field is schemaless as far as the CRUDL itself is concerned, leaving that to Typescript on the frontend
//   - keyed/indexed by type+id, parentType+parentId+(child)type, userId+type for a broad set of access patterns
//   - 'all' is a reserved type that acts as a catch-all, so can't be an entity type
//   - open/closed principle: do not change underlying code, just use the types and helper functions using the signatures below
//
// Exported from crudl-api-*.ts:
// ```ts
// interface Item { type: string; id: string; parentType?: string; parentId?: string; data: ItemData; meta: ItemMeta; user: string; /* unique user id */ }
// interface ItemData { Record<string, any>; }
// interface ItemMeta { createdAt: string; updatedAt: string; version: number; }
// interface QueryResponse { items: Item[]; nextPage?: string; }
// interface QueryOptions { limit?: number; nextPage?: string; user?: string /* user override is admin only */ }
//
// function makeAdmin() /* sets the instance to use the admin CRUDL endpoints instead of the user CRUDL endpoints; only call this on pages gated to users with admin role */
//
// async function createItem(item: Partial<Item>): Promise<Item> // admin users can include an item.user; non-admin users have that overridden by the authN layer user ID
// async function readItem(type: string, id: string): Promise<Item> // admin users can read any item, independent of owner/`user`; non-admin users are limited to entities they own
// async function upsertItem(type: string, id: string, Partial<Item>): Promise<Item> // admin users can include an item.user; non-admin users have that overridden by the authN layer user ID
// async function updateItemData(type: string, id: string, dataUpdates: ItemData): Promise<Item> // admin users can update the data of any item, independent of owner/`user`; non-admin users are limited to entities they own
// async function deleteItem(type: string, id: string): Promise<void> // admin users can delete any item, independent of owner/`user`; non-admin users are limited to entities they own
// async function listChildItems(parentType: string, parentId: string, childType?: string, /* can be 'all' (default) to retrieve all direct children */ options?: QueryOptions): Promise<QueryResponse> // admin users can limit by options.user or default to entities from all users; non-admin users are limited to entities they own
// async function listUserItems(type?: string, /* can be 'all' (default) to retrieve all direct children */ options?: QueryOptions): Promise<QueryResponse> // admin users can limit by options.user or default to entities from all users; non-admin users are limited to entities they own
//
// /* deprecated */ async function updateItem( type: string, id: string, data: Record<string, any>, options?: { merge?: boolean }): Promise<Item> // deprecated, use upsertItem and updateItemData depending on the merge value
// /* deprecated */ async function listChildren( parentType: string, parentId: string, childType?: string, /* can be 'all' (default) to retrieve all direct children */ options?: { limit?: number; nextCursor?: string }): Promise<QueryResponse> // deprecated, use listChildItems
// ```

export * from './crudl-api-local'
//export * from './crudl-api-aws'
//export * from './crudl-api-cloudflare'
