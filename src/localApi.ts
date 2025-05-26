import { useLocalItemsStore } from '@/stores/localItems';

export interface ItemMeta {
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Item extends BaseItem {
  pk?: string; // for internal store use if needed, mirrors DynamoDB pk
  sk?: string; // for internal store use if needed, mirrors DynamoDB sk
}

export interface BaseItem {
  type: string;
  id?: string;
  parentType?: string;
  parentId?: string;
  data?: Record<string, any>;
  meta?: ItemMeta;
  user?: string; // Cognito user sub
}

export interface QueryResponse {
  items: Item[];
  nextCursor?: string;
}

/* --- */

export async function createItem(
  item: Partial<BaseItem>
): Promise<BaseItem> {
  const store = useLocalItemsStore();
  return store.createItem(item);
}

export async function readItem(
  type: string,
  id: string
): Promise<BaseItem> {
  const store = useLocalItemsStore();
  return store.readItem(type, id);
}

export async function updateItem(
  type: string,
  id: string,
  data: Record<string, any>,
  options?: { merge?: boolean }
): Promise<BaseItem> {
  const store = useLocalItemsStore();
  return store.updateItem(type, id, data, options);
}

export async function deleteItem(
  type: string,
  id: string
): Promise<void> {
  const store = useLocalItemsStore();
  return store.deleteItem(type, id);
}

export async function listChildren(
  parentType: string,
  parentId: string,
  childType?: string,
  options?: { limit?: number; nextCursor?: string }
): Promise<QueryResponse> {
  const store = useLocalItemsStore();
  return store.listChildren(parentType, parentId, childType, options);
}

export async function listUserItems(
  type?: string,
  options?: { limit?: number; nextCursor?: string }
): Promise<QueryResponse> {
  const store = useLocalItemsStore();
  return store.listUserItems(type, options);
}
