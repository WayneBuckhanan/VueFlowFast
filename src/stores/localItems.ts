import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as API from '../localApi';

function generateStorageKey(type: string, id: string): string {
  return `${type}#${id}`;
}

export const useLocalItemsStore = defineStore('localItems', () => {
  const items = ref(new Map<string, Item>());

  async function createItem(item: Partial<API.BaseItem>): Promise<API.BaseItem> {
      const itemId = item.id || crypto.randomUUID();
      const itemType = item.type;
      const itemParentType = item.parentType || 'USER';
      const itemParentId = item.parentId || 'USER_ID'; // Simulated single user

      const pk = `${itemParentType}#${itemParentId}`;
      const sk = `${itemType}#${itemId}`;

      const now = new Date().toISOString();
      const meta: API.ItemMeta = {
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const newItem: Item = {
        type: itemType,
        id: itemId,
        parentType: itemParentType,
        parentId: itemParentId,
        data: item?.data || {},
        meta,
        user: 'USER_ID', // Associate with the simulated single user
        pk,
        sk,
      };

      const storageKey = generateStorageKey(itemType, itemId);
      if (items.value.has(storageKey)) {
        throw new Error(`Item with key ${storageKey} already exists`);
      }

      items.value.set(storageKey, newItem);
      return { items: [newItem] };
    }

    async function readItem(type: string, id: string): Promise<API.BaseItem> {
      const storageKey = generateStorageKey(type, id);
      const item = items.value.get(storageKey);
      if (!item) throw new Error('Item not found');
      return item;
    }

    async function updateItem(
      type: string,
      id: string,
      data: Record<string, any>,
      options?: { merge?: boolean }
    ): Promise<API.BaseItem> {
      const storageKey = generateStorageKey(type, id);
      const existingItem = items.value.get(storageKey);
      if (!existingItem) throw new Error('Item not found');

      const updatedData = options?.merge ? { ...existingItem.data, ...data } : data;

      const currentMeta = existingItem.meta || { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 0 };

      const newMeta: ItemMeta = {
        ...currentMeta,
        updatedAt: new Date().toISOString(),
        version: currentMeta.version + 1,
      };

      const updatedItem: API.Item = {
        ...existingItem,
        data: updatedData,
        meta: newMeta,
      };

      items.value.set(storageKey, updatedItem);
      return { items: [updatedItem] };
    }

    async function deleteItem(type: string, id: string): Promise<void> {
      const storageKey = generateStorageKey(type, id);
      if (!items.value.has(storageKey)) {
        throw new Error('Item not found for delete');
      }
      items.value.delete(storageKey);
      return Promise.resolve();
    }

    async function listChildren(
      parentType: string,
      parentId: string,
      childType='all',
      options?: { limit?: number; nextCursor?: string }
    ): Promise<API.QueryResponse> {
      const limit = options?.limit || 50;
      const startIndex = options?.nextCursor ? parseInt(options.nextCursor, 10) : 0;

      const allMatchingChildren: Item[] = [];
      for (const item of items.value.values()) {
        if (item.parentType === parentType && item.parentId === parentId) {
          if (childType && childType !== 'all' && item.type !== childType) {
            continue;
          }
          allMatchingChildren.push(item);
        }
      }

      const paginatedItems = allMatchingChildren.slice(startIndex, startIndex + limit);
      let newNextCursor: string | undefined = undefined;

      if (startIndex + limit < allMatchingChildren.length) {
        newNextCursor = (startIndex + limit).toString();
      }

      return { items: paginatedItems, nextCursor: newNextCursor };
    }

    async function listUserItems(
      type='all',
      options?: { limit?: number; nextCursor?: string }
    ): Promise<API.QueryResponse> {
      const limit = options?.limit || 50;
      const startIndex = options?.nextCursor ? parseInt(options.nextCursor, 0) : 0;

      // Get all items from the store
      let allItemsInStore: Item[] = Array.from(items.value.values());

      let filteredItems: Item[];
      if (type && type !== 'all') {
        // Filter by type if provided and not 'all'
        filteredItems = allItemsInStore.filter(item => item.type === type);
      } else {
        // Otherwise, use all items (no type filter or type is 'all')
        filteredItems = allItemsInStore;
      }

      const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);
      const newNextCursor = (startIndex + limit < filteredItems.length) ? (startIndex + limit).toString() : undefined;

      // Using Promise.resolve as per example, though direct return of the object is also fine in async function
      return Promise.resolve({ items: paginatedItems, nextCursor: newNextCursor });
    }

    return {
      items,
      createItem,
      readItem,
      updateItem,
      deleteItem,
      listChildren,
      listUserItems
    }
  },
  {
    persist: {
      key: 'localItems',
      storage: localStorage,
      serializer: {
        serialize: (state) => {
          return JSON.stringify(Array.from(state.items.entries()))
        },
        deserialize: (storedValue) => {
          try {
            const entries = JSON.parse(storedValue)
            return { items: new Map(entries) }
          } catch {
            return { items: new Map() }
          }
        }
      }
    },
  }
);
