# Generic CRUDL Interface - Cloudflare Workers implementation

## Server-side helper functions

```ts
function createItem(item: Partial<Item>): Item
function readItem(type: string, id: string): Item
function upsertItem(type: string, id: string, Partial<Item>): Item
function updateItemData(type: string, id: string, data: ItemData): Item
function deleteItem(type: string, id: string): void
function listChildItems(parentType: string, parentId: string, childType='all', options?: { limit?: number; nextCursor?: string }): QueryResponse
function listUserItems(user: string, type='all', options?: { limit?: number; nextCursor?: string }): QueryResponse
```

### Client-side helper functions
- will be equivalent but return Promises (e.g. Promise<Item> instead of Item)
- frontend only accesses the current user, so the function signature is listUserItems(type, options?) and the server side will pull the user field from the authN headers/cookies


## Primary endpoints

| Method Path                                        | Handler              | Request DTO   | Response code, DTO | Description     |
|----------------------------------------------------|----------------------|---------------|--------------------|-----------------|
| POST   /api/v3/items/{type}                              | handleCreateItem     | Partial<Item> | 201 Item           | Create new item |
| GET    /api/v3/items/{type}/{id}                         | handleReadItem       | N/A           | 200 Item           | Get single item by type and ID |
| PUT    /api/v3/items/{type}/{id}                         | handleUpsertItem     | Item          | 200 Item           | Create or update existing item by replacing whole item |
| PATCH  /api/v3/items/{type}/{id}                         | handleUpdateItem     | Partial<Item> | 200 Item           | Update existing item by only modifying included fields |
| DELETE /api/v3/items/{type}/{id}                         | handleDeleteItem     | N/A           | 204 void           | Delete item |
| GET    /api/v3/items/{parentType}/{parentId}/{childType} | handleListChildItems | N/A           | 200 QueryResponse  | Get children of specific childType (or 'all') for parent, pagination via ?limit&nextCursor |
| GET    /api/v3/items/{type}                              | handleListUserItems  | N/A           | 200 QueryResponse  | Get items of type (or 'all') for current user, pagination via ?limit&nextCursor |

This API is built on top of a single-table D1.
The table has type (string), id (string), parentType (nullable string), parentId (nullable string), data (schemaless JSON), meta (schemaless JSON), user (uuid), createdAt (datetime), updatedAt (datetime), version (integer) columns.
Queries to the API will have all meta sub-fields packed into the single meta JSON object and the backend should bundle createdAt, updatedAt, and version into that meta JSON before returning the Item.
We are indexing on type,id as well as parentType,parentId, and user.

```ts
export interface Item {
  type: string;
  id: string;
  parentType?: string;
  parentId?: string;
  data?: Record<string, any>;
  meta?: ItemMeta;
  user?: string;
}

export interface ItemData {
  [key: string]: any
}

export interface ItemMeta {
  createdAt: string;
  updatedAt: string;
  version: number;
  [key: string]: string;
}

export interface QueryResponse {
  items: Item[];
  nextCursor?: string;
}
```


