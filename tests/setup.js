import { beforeAll, beforeEach } from 'vitest'

// Test database schema
// Individual SQL statements as single lines to avoid D1 parsing issues
const testSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS items (type TEXT NOT NULL, id TEXT NOT NULL, parentType TEXT, parentId TEXT, data TEXT, user TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, version INTEGER DEFAULT 1, PRIMARY KEY (type, id))`,
  `CREATE INDEX IF NOT EXISTS idx_parent ON items(parentType, parentId)`,
  `CREATE INDEX IF NOT EXISTS idx_user_type ON items(user, type)`,
  `CREATE INDEX IF NOT EXISTS idx_user ON items(user)`,
  `CREATE INDEX IF NOT EXISTS idx_type ON items(type)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, lastLoginAt DATETIME)`,
  `CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY, userId TEXT NOT NULL, token TEXT NOT NULL, expiresAt DATETIME NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS verification_codes (id TEXT PRIMARY KEY, email TEXT NOT NULL, code TEXT NOT NULL, expiresAt DATETIME NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, used BOOLEAN DEFAULT FALSE)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email)`,
  `CREATE INDEX IF NOT EXISTS idx_verification_code ON verification_codes(code)`
]

// Global test setup
beforeAll(async () => {
  // Setup test environment
  console.log('Setting up test environment...')
  if (env?.DB) {    
    // Ensure schema exists - execute statements individually
    console.log('Number of statements:', testSchemaStatements.length)
    for (let i = 0; i < testSchemaStatements.length; i++) {
      const statement = testSchemaStatements[i]
      console.log(`Executing statement ${i + 1}:`, statement.substring(0, 50) + '...')
      try {
        await env.DB.prepare(statement).run()
      } catch (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message)
        console.error('Statement was:', statement)
        throw error
      }
    }
  }
})

import { env } from "cloudflare:test"
beforeEach(async (context) => {
  // Reset database for each test
  if (env?.DB) {
    try {
      // Clear all tables
      await env.DB.exec(`
        DELETE FROM verification_codes;
        DELETE FROM user_sessions;
        DELETE FROM users;
        DELETE FROM items;
      `)
    } catch (error) {
      // Tables might not exist yet, create them
      console.log('Creating test database schema...')
    }
  }
})

// Test utilities
export const createTestUser = async (db, userData = {}) => {
  const defaultUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    ...userData
  }
  
  await db.prepare(`
    INSERT INTO users (id, email, name, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).bind(defaultUser.id, defaultUser.email, defaultUser.name).run()
  
  return defaultUser
}

export const createTestSession = async (db, userId, sessionData = {}) => {
  const defaultSession = {
    id: 'test-session-123',
    userId,
    token: 'test-token-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    ...sessionData
  }
  
  await db.prepare(`
    INSERT INTO user_sessions (id, userId, token, expiresAt, createdAt)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).bind(defaultSession.id, defaultSession.userId, defaultSession.token, defaultSession.expiresAt).run()
  
  return defaultSession
}

export const createTestItem = async (db, itemData = {}) => {
  const defaultItem = {
    type: 'project',
    id: 'test-item-123',
    data: JSON.stringify({ name: 'Test Project', description: 'Test Description' }),
    user: 'test-user-123',
    parentType: null,
    parentId: null,
    ...itemData
  }
  
  await db.prepare(`
    INSERT INTO items (type, id, parentType, parentId, data, user, createdAt, updatedAt, version)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
  `).bind(
    defaultItem.type,
    defaultItem.id,
    defaultItem.parentType,
    defaultItem.parentId,
    defaultItem.data,
    defaultItem.user
  ).run()
  
  return defaultItem
}

export const createAuthHeaders = (token = 'test-token-123') => {
  return {
    'Cookie': `session=${token}`,
    'Content-Type': 'application/json'
  }
}

// Mock environment for tests that need it
export const mockEnv = {
  DB: 'test-db',
  ENVIRONMENT: 'test',
  MAILJET_API_KEY: 'test-mailjet-key',
  MAILJET_SECRET_KEY: 'test-mailjet-secret',
  FROM_EMAIL: 'test@example.com',
  FROM_NAME: 'Test App'
}