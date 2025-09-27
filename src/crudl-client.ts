// Big picture: generic CRUDL API interface
//   - designed for extreme prototyping without knowing what database/storage is backing the API (we have Pinia store, AWS DynamoDB, and Cloudflare D1 versions already, you don't need to know which is deployed)
//   - intentionally flexible for the exploration phase, assumes sorting/filtering will happen on frontend (prototype scale data, not production)
//   - data field is schemaless as far as the CRUDL itself is concerned, leaving that to Typescript on the frontend
//   - keyed/indexed by type+id, parentType+parentId+(child)type, userId+type for a broad set of access patterns
//   - open/closed principle: do not change underlying code, just use the types and helper functions using the signatures below
// 
// ```ts
// export interface ItemMeta { createdAt: string; updatedAt: string; version: number; }
// export interface Item { type: string; id: string; parentType?: string; parentId?: string; data: Record<string, any>; meta: ItemMeta; user: string; /* unique user id */ }
// export interface QueryResponse { items: Item[]; nextPage?: string; }
// 
// export async function createItem(item: Partial<Item>): Promise<Item>
// export async function readItem(type: string, id: string): Promise<Item>
// export async function updateItem(type: string, id: string, data: Record<string, any>, options?: { merge?: boolean }): Promise<Item>
// export async function deleteItem(type: string, id: string): Promise<void>
// export async function listChildren(parentType: string, parentId: string, childType?: string, /* can be 'all' (default) to retrieve all direct children */ options?: { limit?: number; nextPage?: string }): Promise<QueryResponse>
// export async function listUserItems( /* assumes the userId attached to the request */ type?: string, /* can be 'all' (default) to retrieve all direct children */ options?: { limit?: number; nextPage?: string }): Promise<QueryResponse>
// ```
 
export * from './crudl-api-local'
//export * from './crudl-api-aws'
//export * from './crudl-api-cloudflare'
