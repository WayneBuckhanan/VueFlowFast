import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseService } from '../api/services/database.js'
import { createTestUser, createTestItem, mockEnv } from './setup.js'
import { env } from "cloudflare:test"

describe('Database Service', () => {
  let dbService
  let testUser

  beforeEach(async (ctx) => {
    dbService = new DatabaseService(env.DB)
    testUser = await createTestUser(env.DB)
  })

  describe('createItem', () => {
    it('should create a new project item', async () => {
      const itemData = {
        id: 'proj-001',
        data: { name: 'Test Project', description: 'A test project' },
        userId: testUser.id
      }

      const result = await dbService.createItem('project', itemData)

      expect(result.type).toBe('project')
      expect(result.id).toBe('proj-001')
      expect(result.data.name).toBe('Test Project')
      expect(result.user).toBe(testUser.id)
      expect(result.meta.createdAt).toBeTruthy()
      expect(result.meta.updatedAt).toBeTruthy()
      expect(result.meta.version).toBe(1)
    })

    it('should create item with parent relationship', async () => {
      // Create parent project first
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Parent Project' }),
        user: testUser.id
      })

      const taskData = {
        id: 'task-001',
        data: { title: 'Test Task', status: 'pending' },
        parentType: 'project',
        parentId: 'proj-001',
        userId: testUser.id
      }

      const result = await dbService.createItem('task', taskData)

      expect(result.type).toBe('task')
      expect(result.parentType).toBe('project')
      expect(result.parentId).toBe('proj-001')
      expect(result.data.title).toBe('Test Task')
    })

    it('should auto-generate ID if not provided', async () => {
      const itemData = {
        data: { name: 'Auto ID Project' },
        userId: testUser.id
      }

      const result = await dbService.createItem('project', itemData)

      expect(result.id).toBeTruthy()
      expect(result.id).toMatch(/^[a-f0-9-]{36}$/) // UUID format
    })

    it('should handle duplicate ID error', async () => {
      const itemData = {
        id: 'duplicate-001',
        data: { name: 'First Item' },
        userId: testUser.id
      }

      // Create first item
      await dbService.createItem('project', itemData)

      // Try to create duplicate
      await expect(
        dbService.createItem('project', itemData)
      ).rejects.toThrow()
    })

    it('should validate required fields', async () => {
      // Missing userId
      await expect(
        dbService.createItem('project', { data: { name: 'Test' } })
      ).rejects.toThrow()
    })
  })

  describe('readItem', () => {
    it('should retrieve existing item', async () => {
      // Create test item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Test Project', description: 'Test Description' }),
        user: testUser.id
      })

      const result = await dbService.readItem('project', 'proj-001')

      expect(result.type).toBe('project')
      expect(result.id).toBe('proj-001')
      expect(result.data.name).toBe('Test Project')
      expect(result.data.description).toBe('Test Description')
      expect(result.user).toBe(testUser.id)
    })

    it('should throw error for non-existent item', async () => {
      await expect(
        dbService.readItem('project', 'non-existent')
      ).rejects.toThrow('Item not found')
    })

    it('should parse JSON data correctly', async () => {
      const complexData = {
        name: 'Complex Project',
        settings: {
          notifications: true,
          theme: 'dark'
        },
        tags: ['important', 'urgent'],
        metadata: {
          created_by: 'system',
          priority: 1
        }
      }

      await createTestItem(env.DB, {
        type: 'project',
        id: 'complex-001',
        data: JSON.stringify(complexData),
        user: testUser.id
      })

      const result = await dbService.readItem('project', 'complex-001')

      expect(result.data).toEqual(complexData)
      expect(result.data.settings.notifications).toBe(true)
      expect(result.data.tags).toHaveLength(2)
    })
  })

  describe('updateItem', () => {
    it('should update item data', async () => {
      // Create initial item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Original Project', description: 'Original description' }),
        user: testUser.id
      })

      const updateData = {
        name: 'Updated Project',
        description: 'Updated description'
      }

      const result = await dbService.updateItem('project', 'proj-001', updateData)

      expect(result.data.name).toBe('Updated Project')
      expect(result.data.description).toBe('Updated description')
      expect(result.meta.version).toBe(2)
      expect(result.meta.updatedAt).toBeTruthy()
    })

    it('should merge data when merge option is true', async () => {
      // Create initial item with multiple fields
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({
          name: 'Original Project',
          description: 'Original description',
          status: 'active',
          priority: 'high'
        }),
        user: testUser.id
      })

      const updateData = {
        name: 'Updated Project',
        description: 'Updated description'
      }

      const result = await dbService.updateItem('project', 'proj-001', updateData, { merge: true })

      expect(result.data.name).toBe('Updated Project')
      expect(result.data.description).toBe('Updated description')
      expect(result.data.status).toBe('active') // Should be preserved
      expect(result.data.priority).toBe('high') // Should be preserved
    })

    it('should replace data when merge option is false', async () => {
      // Create initial item with multiple fields
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({
          name: 'Original Project',
          description: 'Original description',
          status: 'active',
          priority: 'high'
        }),
        user: testUser.id
      })

      const updateData = {
        name: 'Updated Project',
        description: 'Updated description'
      }

      const result = await dbService.updateItem('project', 'proj-001', updateData, { merge: false })

      expect(result.data.name).toBe('Updated Project')
      expect(result.data.description).toBe('Updated description')
      expect(result.data.status).toBeUndefined() // Should be removed
      expect(result.data.priority).toBeUndefined() // Should be removed
    })

    it('should increment version number', async () => {
      // Create initial item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Original Project' }),
        user: testUser.id
      })

      // Update multiple times
      await dbService.updateItem('project', 'proj-001', { name: 'Update 1' })
      await dbService.updateItem('project', 'proj-001', { name: 'Update 2' })
      const result = await dbService.updateItem('project', 'proj-001', { name: 'Update 3' })

      expect(result.meta.version).toBe(4) // Started at 1, incremented 3 times
    })

    it('should throw error for non-existent item', async () => {
      await expect(
        dbService.updateItem('project', 'non-existent', { name: 'Updated' })
      ).rejects.toThrow('Item not found')
    })
  })

  describe('deleteItem', () => {
    it('should delete single item', async () => {
      // Create test item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Test Project' }),
        user: testUser.id
      })

      await dbService.deleteItem('project', 'proj-001', testUser.id)

      // Verify item is deleted
      await expect(
        dbService.readItem('project', 'proj-001')
      ).rejects.toThrow('Item not found')
    })

    it('should cascade delete children', async () => {
      // Create project with task and subtask hierarchy
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Parent Project' }),
        user: testUser.id
      })

      await createTestItem(env.DB, {
        type: 'task',
        id: 'task-001',
        parentType: 'project',
        parentId: 'proj-001',
        data: JSON.stringify({ title: 'Child Task' }),
        user: testUser.id
      })

      await createTestItem(env.DB, {
        type: 'subtask',
        id: 'subtask-001',
        parentType: 'task',
        parentId: 'task-001',
        data: JSON.stringify({ title: 'Child Subtask' }),
        user: testUser.id
      })

      // Delete the project (should cascade)
      await dbService.deleteItem('project', 'proj-001', testUser.id)

      // Verify all items are deleted
      await expect(dbService.readItem('project', 'proj-001')).rejects.toThrow('Item not found')
      await expect(dbService.readItem('task', 'task-001')).rejects.toThrow('Item not found')
      await expect(dbService.readItem('subtask', 'subtask-001')).rejects.toThrow('Item not found')
    })

    it('should only delete items owned by user', async () => {
      const otherUser = await createTestUser(env.DB, { id: 'other-user', email: 'other@example.com' })

      // Create item owned by other user
      await createTestItem(env.DB, {
        type: 'project',
        id: 'other-proj',
        data: JSON.stringify({ name: 'Other User Project' }),
        user: otherUser.id
      })

      // Try to delete as current user
      await expect(
        dbService.deleteItem('project', 'other-proj', testUser.id)
      ).rejects.toThrow('Item not found')

      // Verify item still exists
      const item = await dbService.readItem('project', 'other-proj')
      expect(item.user).toBe(otherUser.id)
    })

    it('should throw error for non-existent item', async () => {
      await expect(
        dbService.deleteItem('project', 'non-existent', testUser.id)
      ).rejects.toThrow('Item not found')
    })
  })

  describe('listUserItems', () => {
    beforeEach(async () => {
      // Create test items for user
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Project 1' }),
        user: testUser.id
      })

      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-002',
        data: JSON.stringify({ name: 'Project 2' }),
        user: testUser.id
      })

      await createTestItem(env.DB, {
        type: 'task',
        id: 'task-001',
        parentType: 'project',
        parentId: 'proj-001',
        data: JSON.stringify({ title: 'Task 1' }),
        user: testUser.id
      })

      // Create item for different user
      const otherUser = await createTestUser(env.DB, { id: 'other-user', email: 'other@example.com' })
      await createTestItem(env.DB, {
        type: 'project',
        id: 'other-proj',
        data: JSON.stringify({ name: 'Other Project' }),
        user: otherUser.id
      })
    })

    it('should list all items for user when type is "all"', async () => {
      const result = await dbService.listUserItems(testUser.id, 'all')

      expect(result.items).toHaveLength(3)
      expect(result.items.every(item => item.user === testUser.id)).toBe(true)
      
      const types = result.items.map(item => item.type).sort()
      expect(types).toEqual(['project', 'project', 'task'])
    })

    it('should list items of specific type', async () => {
      const result = await dbService.listUserItems(testUser.id, 'project')

      expect(result.items).toHaveLength(2)
      expect(result.items.every(item => item.type === 'project')).toBe(true)
      expect(result.items.every(item => item.user === testUser.id)).toBe(true)
    })

    it('should support pagination', async () => {
      // Create more items for pagination test
      for (let i = 3; i <= 10; i++) {
        await createTestItem(env.DB, {
          type: 'project',
          id: `proj-${i.toString().padStart(3, '0')}`,
          data: JSON.stringify({ name: `Project ${i}` }),
          user: testUser.id
        })
      }

      const result = await dbService.listUserItems(testUser.id, 'project', { limit: 5, offset: 0 })

      expect(result.items).toHaveLength(5)
      expect(result.nextOffset).toBe(5)
    })

    it('should return empty array for user with no items', async () => {
      const emptyUser = await createTestUser(env.DB, { id: 'empty-user', email: 'empty@example.com' })
      
      const result = await dbService.listUserItems(emptyUser.id, 'all')

      expect(result.items).toHaveLength(0)
      expect(result.nextOffset).toBe(0)
    })

    it('should sort items by creation date (newest first)', async () => {
      const result = await dbService.listUserItems(testUser.id, 'project')

      expect(result.items).toHaveLength(2)
      
      // Should be sorted by createdAt DESC
      const dates = result.items.map(item => new Date(item.meta.createdAt))
      expect(dates[0] >= dates[1]).toBe(true)
    })
  })

  describe('listChildren', () => {
    beforeEach(async () => {
      // Create parent project
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Parent Project' }),
        user: testUser.id
      })

      // Create child tasks
      await createTestItem(env.DB, {
        type: 'task',
        id: 'task-001',
        parentType: 'project',
        parentId: 'proj-001',
        data: JSON.stringify({ title: 'Task 1' }),
        user: testUser.id
      })

      await createTestItem(env.DB, {
        type: 'task',
        id: 'task-002',
        parentType: 'project',
        parentId: 'proj-001',
        data: JSON.stringify({ title: 'Task 2' }),
        user: testUser.id
      })

      // Create child note
      await createTestItem(env.DB, {
        type: 'note',
        id: 'note-001',
        parentType: 'project',
        parentId: 'proj-001',
        data: JSON.stringify({ content: 'Project note' }),
        user: testUser.id
      })

      // Create subtask for task-001
      await createTestItem(env.DB, {
        type: 'subtask',
        id: 'subtask-001',
        parentType: 'task',
        parentId: 'task-001',
        data: JSON.stringify({ title: 'Subtask 1' }),
        user: testUser.id
      })
    })

    it('should list children of specific type', async () => {
      const result = await dbService.listChildren('project', 'proj-001', 'task')

      expect(result.items).toHaveLength(2)
      expect(result.items.every(item => item.type === 'task')).toBe(true)
      expect(result.items.every(item => item.parentId === 'proj-001')).toBe(true)
    })

    it('should list all children when type is "all"', async () => {
      const result = await dbService.listChildren('project', 'proj-001', 'all')

      expect(result.items).toHaveLength(3) // 2 tasks + 1 note
      expect(result.items.every(item => item.parentId === 'proj-001')).toBe(true)
      
      const types = result.items.map(item => item.type).sort()
      expect(types).toEqual(['note', 'task', 'task'])
    })

    it('should support nested children', async () => {
      const result = await dbService.listChildren('task', 'task-001', 'subtask')

      expect(result.items).toHaveLength(1)
      expect(result.items[0].type).toBe('subtask')
      expect(result.items[0].parentId).toBe('task-001')
    })

    it('should return empty array for parent with no children', async () => {
      // Create parent with no children
      await createTestItem(env.DB, {
        type: 'project',
        id: 'empty-proj',
        data: JSON.stringify({ name: 'Empty Project' }),
        user: testUser.id
      })

      const result = await dbService.listChildren('project', 'empty-proj', 'task')

      expect(result.items).toHaveLength(0)
      expect(result.nextOffset).toBe(0)
    })

    it('should support pagination', async () => {
      // Create more child tasks
      for (let i = 3; i <= 10; i++) {
        await createTestItem(env.DB, {
          type: 'task',
          id: `task-${i.toString().padStart(3, '0')}`,
          parentType: 'project',
          parentId: 'proj-001',
          data: JSON.stringify({ title: `Task ${i}` }),
          user: testUser.id
        })
      }

      const result = await dbService.listChildren('project', 'proj-001', 'task', { limit: 5, offset: 0 })

      expect(result.items).toHaveLength(5)
      expect(result.nextOffset).toBe(5)
    })

    it('should sort children by creation date (newest first)', async () => {
      const result = await dbService.listChildren('project', 'proj-001', 'task')

      expect(result.items).toHaveLength(2)
      
      // Should be sorted by createdAt DESC
      const dates = result.items.map(item => new Date(item.meta.createdAt))
      expect(dates[0] >= dates[1]).toBe(true)
    })
  })

  describe('Data Integrity', () => {
    it('should handle JSON serialization/deserialization correctly', async () => {
      const complexData = {
        string: 'test string',
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 2, 3, 'four'],
        object: {
          nested: {
            deeply: {
              value: 'deep value'
            }
          }
        },
        special_chars: 'Special chars: àáâãäåæçèéêë',
        unicode: '🚀 Unicode test 中文 العربية'
      }

      const item = await dbService.createItem('project', {
        id: 'complex-data',
        data: complexData,
        userId: testUser.id
      })

      expect(item.data).toEqual(complexData)

      // Verify by reading back
      const retrieved = await dbService.readItem('project', 'complex-data')
      expect(retrieved.data).toEqual(complexData)
    })

    it('should handle empty data objects', async () => {
      const item = await dbService.createItem('project', {
        id: 'empty-data',
        data: {},
        userId: testUser.id
      })

      expect(item.data).toEqual({})
    })

    it('should handle null data', async () => {
      const item = await dbService.createItem('project', {
        id: 'null-data',
        data: null,
        userId: testUser.id
      })

      expect(item.data).toBeNull()
    })

    it('should maintain referential integrity', async () => {
      // Create parent
      const parent = await dbService.createItem('project', {
        id: 'parent-001',
        data: { name: 'Parent Project' },
        userId: testUser.id
      })

      // Create child
      const child = await dbService.createItem('task', {
        id: 'child-001',
        data: { title: 'Child Task' },
        parentType: 'project',
        parentId: parent.id,
        userId: testUser.id
      })

      // Verify relationship
      expect(child.parentType).toBe('project')
      expect(child.parentId).toBe(parent.id)

      // Verify child appears in parent's children
      const children = await dbService.listChildren('project', parent.id, 'task')
      expect(children.items).toHaveLength(1)
      expect(children.items[0].id).toBe(child.id)
    })

    it('should handle concurrent operations', async () => {
      const itemId = 'concurrent-test'
      
      // Create initial item
      await dbService.createItem('project', {
        id: itemId,
        data: { counter: 0 },
        userId: testUser.id
      })

      // Simulate concurrent updates
      const promises = []
      for (let i = 1; i <= 5; i++) {
        promises.push(
          dbService.updateItem('project', itemId, { counter: i, update: i })
        )
      }

      const results = await Promise.all(promises)
      
      // All updates should succeed
      results.forEach(result => {
        expect(result.type).toBe('project')
        expect(result.id).toBe(itemId)
      })

      // Final item should have one of the update values
      const final = await dbService.readItem('project', itemId)
      expect(final.data.counter).toBeGreaterThan(0)
      expect(final.data.counter).toBeLessThanOrEqual(5)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now()
      
      // Create many items
      const promises = []
      for (let i = 1; i <= 100; i++) {
        promises.push(
          dbService.createItem('project', {
            id: `perf-${i.toString().padStart(3, '0')}`,
            data: { name: `Performance Test Project ${i}`, index: i },
            userId: testUser.id
          })
        )
      }

      await Promise.all(promises)
      
      const createTime = Date.now() - startTime
      console.log(`Created 100 items in ${createTime}ms`)

      // Test querying
      const queryStart = Date.now()
      const result = await dbService.listUserItems(testUser.id, 'project', { limit: 50 })
      const queryTime = Date.now() - queryStart
      
      console.log(`Queried 50 items in ${queryTime}ms`)
      
      expect(result.items).toHaveLength(50)
      expect(createTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})