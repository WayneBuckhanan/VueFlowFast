import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createTestUser, createTestSession, createTestItem, createAuthHeaders, mockEnv } from './setup.js'
import { env } from "cloudflare:test"

// Import the API handlers
import {
  handleCreateItem,
  handleReadItem,
  handleUpdateItem,
  handleDeleteItem,
  handleListChildren,
  handleListUserItems,
  handleHealthCheck
} from '../api/handlers/items.js'

// Import error handler
import { errorHandler } from '../api/middleware/error.js'

// Create test app
const createTestApp = () => {
  const app = new Hono()
  
  // Add middleware to set env and auth context
  app.use('*', async (c, next) => {
    // Preserve auth context from the original environment before overwriting
    const originalAuth = c.env.auth
    c.env = { ...mockEnv, DB: c.env.DB }
    
    // Mock authentication context for tests
    // Check if auth context is provided in the request environment
    if (originalAuth && originalAuth.userId) {
      c.set('auth', originalAuth)
      c.set('userId', originalAuth.userId)
    } else {
      // Default to not-logged-in for tests that don't specify auth
      c.set('auth', { userId: 'not-logged-in' })
      c.set('userId', 'not-logged-in')
    }
    
    await next()
  })
  
  // Add error handler
  app.onError(errorHandler)
  
  // Add routes
  // User-specific endpoints (must come first to avoid conflicts)
  app.get('/api/v1/user/:type', handleListUserItems)
  app.get('/api/v1/health', handleHealthCheck)
  
  // Primary CRUDL endpoints
  app.post('/api/v1/:type', handleCreateItem)
  app.get('/api/v1/:type/:id', handleReadItem)
  app.put('/api/v1/:type/:id', handleUpdateItem)
  app.delete('/api/v1/:type/:id', handleDeleteItem)
  
  // Hierarchical endpoints
  app.get('/api/v1/:parentType/:parentId/:childType', handleListChildren)
  
  return app
}

describe('API Endpoints', () => {
  let app
  let testUser
  let testSession

  beforeEach(async () => {
    app = createTestApp()
    
    // Create test user and session
    testUser = await createTestUser(env.DB)
    testSession = await createTestSession(env.DB, testUser.id)
    
    // Set DB in mock env
    mockEnv.DB = env.DB
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.request('/api/v1/health', {
        method: 'GET'
      }, env)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.environment).toBe('test')
    })
  })

  describe('Create Item (POST /:type)', () => {
    it('should create a new project', async () => {
      const projectData = {
        type: 'project',
        id: 'proj-001',
        data: {
          name: 'Test Project',
          description: 'A test project'
        }
      }

      const response = await app.request('/api/v1/project', {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(projectData)
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.type).toBe('project')
      expect(data.id).toBe('proj-001')
      expect(data.data.name).toBe('Test Project')
      expect(data.user).toBe(testUser.id)
    })

    it('should create a task with parent project', async () => {
      // First create a project
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Parent Project' }),
        user: testUser.id
      })

      const taskData = {
        type: 'task',
        id: 'task-001',
        parentType: 'project',
        parentId: 'proj-001',
        data: {
          title: 'Test Task',
          description: 'A test task',
          status: 'pending',
          priority: 'medium'
        }
      }

      const response = await app.request('/api/v1/task', {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(taskData)
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.type).toBe('task')
      expect(data.parentType).toBe('project')
      expect(data.parentId).toBe('proj-001')
      expect(data.data.title).toBe('Test Task')
    })

    it('should create a subtask with parent task', async () => {
      // Create project and task first
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
        data: JSON.stringify({ title: 'Parent Task' }),
        user: testUser.id
      })

      const subtaskData = {
        type: 'subtask',
        id: 'subtask-001',
        parentType: 'task',
        parentId: 'task-001',
        data: {
          title: 'Test Subtask',
          description: 'A test subtask',
          status: 'pending'
        }
      }

      const response = await app.request('/api/v1/subtask', {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(subtaskData)
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.type).toBe('subtask')
      expect(data.parentType).toBe('task')
      expect(data.parentId).toBe('task-001')
      expect(data.data.title).toBe('Test Subtask')
    })

    it('should fail without authentication', async () => {
      const projectData = {
        type: 'project',
        id: 'proj-001',
        data: { name: 'Test Project' }
      }

      const response = await app.request('/api/v1/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      }, env)

      expect(response.status).toBe(401)
    })
  })

  describe('Read Item (GET /:type/:id)', () => {
    it('should retrieve an existing item', async () => {
      // Create test item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Test Project' }),
        user: testUser.id
      })

      const response = await app.request('/api/v1/project/proj-001', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.type).toBe('project')
      expect(data.id).toBe('proj-001')
      expect(data.data.name).toBe('Test Project')
    })

    it('should return 404 for non-existent item', async () => {
      const response = await app.request('/api/v1/project/non-existent', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(404)
    })
  })

  describe('Update Item (PUT /:type/:id)', () => {
    it('should update an existing item', async () => {
      // Create test item
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

      const response = await app.request('/api/v1/project/proj-001', {
        method: 'PUT',
        headers: createAuthHeaders(),
        body: JSON.stringify(updateData)
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.name).toBe('Updated Project')
      expect(data.data.description).toBe('Updated description')
    })

    it('should merge data when merge=true', async () => {
      // Create test item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ 
          name: 'Original Project', 
          description: 'Original description',
          status: 'active'
        }),
        user: testUser.id
      })

      const updateData = {
        name: 'Updated Project'
      }

      const response = await app.request('/api/v1/project/proj-001?merge=true', {
        method: 'PUT',
        headers: createAuthHeaders(),
        body: JSON.stringify(updateData)
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.name).toBe('Updated Project')
      expect(data.data.description).toBe('Original description') // Should be preserved
      expect(data.data.status).toBe('active') // Should be preserved
    })
  })

  describe('Delete Item (DELETE /:type/:id)', () => {
    it('should delete an existing item', async () => {
      // Create test item
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Test Project' }),
        user: testUser.id
      })

      const response = await app.request('/api/v1/project/proj-001', {
        method: 'DELETE',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)

      // Verify item is deleted
      const checkResponse = await app.request('/api/v1/project/proj-001', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(checkResponse.status).toBe(404)
    })

    it('should cascade delete children', async () => {
      // Create project with task and subtask
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

      // Delete project
      const response = await app.request('/api/v1/project/proj-001', {
        method: 'DELETE',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)

      // Verify all items are deleted
      const projectCheck = await app.request('/api/v1/project/proj-001', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })
      expect(projectCheck.status).toBe(404)

      const taskCheck = await app.request('/api/v1/task/task-001', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })
      expect(taskCheck.status).toBe(404)

      const subtaskCheck = await app.request('/api/v1/subtask/subtask-001', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })
      expect(subtaskCheck.status).toBe(404)
    })
  })

  describe('List Children (GET /:parentType/:parentId/:childType)', () => {
    it('should list tasks for a project', async () => {
      // Create project and tasks
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

      const response = await app.request('/api/v1/project/proj-001/task', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.items).toHaveLength(2)
      expect(data.items[0].parentId).toBe('proj-001')
      expect(data.items[1].parentId).toBe('proj-001')
    })

    it('should list all children when childType is "all"', async () => {
      // Create project with mixed children
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
        data: JSON.stringify({ title: 'Task 1' }),
        user: testUser.id
      })

      await createTestItem(env.DB, {
        type: 'note',
        id: 'note-001',
        parentType: 'project',
        parentId: 'proj-001',
        data: JSON.stringify({ content: 'Project note' }),
        user: testUser.id
      })

      const response = await app.request('/api/v1/project/proj-001/all', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.items).toHaveLength(2)
    })
  })

  describe('List User Items (GET /user/:type)', () => {
    it('should list all user projects', async () => {
      // Create multiple projects for user
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

      // Create project for different user
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-003',
        data: JSON.stringify({ name: 'Other User Project' }),
        user: 'other-user'
      })

      const response = await app.request('/api/v1/user/project', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.items).toHaveLength(2)
      expect(data.items.every(item => item.user === testUser.id)).toBe(true)
    })

    it('should list all user items when type is "all"', async () => {
      // Create different types of items
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'Project 1' }),
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

      await createTestItem(env.DB, {
        type: 'note',
        id: 'note-001',
        data: JSON.stringify({ content: 'User note' }),
        user: testUser.id
      })

      const response = await app.request('/api/v1/user/all', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.items).toHaveLength(3)
      expect(data.items.every(item => item.user === testUser.id)).toBe(true)
    })

    it('should support pagination', async () => {
      // Create multiple items
      for (let i = 1; i <= 10; i++) {
        await createTestItem(env.DB, {
          type: 'project',
          id: `proj-${i.toString().padStart(3, '0')}`,
          data: JSON.stringify({ name: `Project ${i}` }),
          user: testUser.id
        })
      }

      const response = await app.request('/api/v1/user/project?limit=5&offset=0', {
        method: 'GET',
        headers: createAuthHeaders()
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.items).toHaveLength(5)
      expect(data.nextOffset).toBe(5)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      const response = await app.request('/api/v1/project', {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({}) // Missing required data
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(400)
    })

    it('should handle invalid JSON', async () => {
      const response = await app.request('/api/v1/project', {
        method: 'POST',
        headers: createAuthHeaders(),
        body: 'invalid json'
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(400)
    })

    it('should handle database errors gracefully', async () => {
      // Try to create item with duplicate primary key
      await createTestItem(env.DB, {
        type: 'project',
        id: 'proj-001',
        data: JSON.stringify({ name: 'First Project' }),
        user: testUser.id
      })

      const duplicateData = {
        type: 'project',
        id: 'proj-001',
        data: { name: 'Duplicate Project' }
      }

      const response = await app.request('/api/v1/project', {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify(duplicateData)
      }, { ...env, auth: { userId: testUser.id } })

      expect(response.status).toBe(400)
    })
  })
})