-- D1 Database Schema for VFF Cloudflare Backend
-- Refactored to use relational structure instead of composite keys

CREATE TABLE IF NOT EXISTS items (
  -- Primary key columns
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  
  -- Parent relationship columns
  parentType TEXT,
  parentId TEXT,
  
  -- Item data and user
  data TEXT, -- JSON string containing item data
  user TEXT, -- User ID (Cognito sub equivalent)
  
  -- Timestamps as separate columns (not in meta JSON)
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Version for optimistic locking
  version INTEGER DEFAULT 1,
  
  PRIMARY KEY (type, id)
);

-- Index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_parent ON items(parentType, parentId);

-- Index for user-specific queries with type filtering
CREATE INDEX IF NOT EXISTS idx_user_type ON items(user, type);

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_user ON items(user);

-- Index for type-specific queries
CREATE INDEX IF NOT EXISTS idx_type ON items(type);

-- Trigger to automatically update updatedAt timestamp
CREATE TRIGGER IF NOT EXISTS update_timestamp 
  AFTER UPDATE ON items
  FOR EACH ROW
BEGIN
  UPDATE items SET updatedAt = CURRENT_TIMESTAMP WHERE type = NEW.type AND id = NEW.id;
END;

-- Sample data structure comments:
-- type: The item type (e.g., "project", "task", "user")
-- id: Unique identifier for the item
-- parentType: Type of the parent item (e.g., "user", "project")
-- parentId: ID of the parent item
-- data: JSON string containing the actual item data
-- user: User identifier for authorization and user-specific queries
-- createdAt/updatedAt: Separate timestamp columns for efficient querying
-- version: Version number for optimistic locking

-- Authentication tables for OpenAuth integration

-- Users table for storing user information
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastLoginAt DATETIME
);

-- User sessions table for managing authentication sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Verification codes table for email-based authentication
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE
);

-- Indexes for authentication tables
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_code ON verification_codes(code);

-- Trigger to update users updatedAt timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
  AFTER UPDATE ON users
  FOR EACH ROW
BEGIN
  UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Example records:
-- type="project", id="proj1", parentType="user", parentId="user123", data='{"name":"My Project"}', user="user123"
-- type="task", id="task1", parentType="project", parentId="proj1", data='{"title":"Task 1"}', user="user123"