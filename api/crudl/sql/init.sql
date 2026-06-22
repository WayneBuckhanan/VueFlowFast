-- D1 Database schema for the adeptify-platform CRUDL API

-- Creates the main table for storing all items.
-- The table uses a single-table design, where item type is part of the primary key.
CREATE TABLE IF NOT EXISTS crudl_items (
  -- Primary key components
  "type" TEXT NOT NULL,
  "id"   TEXT NOT NULL,

  -- Hierarchical relationship
  "parentType" TEXT,
  "parentId"   TEXT,

  -- Schemaless data storage
  "data" TEXT, -- Stored as a JSON string
  "meta" TEXT, -- Stored as a JSON string

  -- Ownership
  "user" TEXT, -- Cognito user sub or similar UUID

  -- Metadata managed by the system
  "createdAt" TEXT NOT NULL, -- ISO 8601 datetime string
  "updatedAt" TEXT NOT NULL, -- ISO 8601 datetime string
  "version"   INTEGER NOT NULL, -- For optimistic locking

  -- Define the composite primary key
  PRIMARY KEY ("type", "id")
);

-- Creates an index for efficiently querying child items of a parent.
CREATE INDEX IF NOT EXISTS "idx_parent" ON "crudl_items" ("parentType", "parentId");

-- Creates an index for efficiently querying all items belonging to a specific user.
CREATE INDEX IF NOT EXISTS "idx_user" ON "crudl_items" ("user");
