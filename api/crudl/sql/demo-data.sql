-- Sample data for the CRUDL API
-- This file provides INSERT statements to populate the crudl_items table for testing.

-- Assumes the table schema from crudl.sql is already created.

-- Insert a top-level "project" item for user-123
INSERT INTO crudl_items (
  "type", "id",
  "parentType", "parentId",
  "data", "meta",
  "user",
  "createdAt", "updatedAt", "version"
) VALUES (
  'project',
  'proj-alpha',
  NULL, NULL,
  '{"name": "Alpha Project", "status": "active", "description": "Our first major project using the new platform."}',
  '{"priority": "high", "tags": ["frontend", "vue"]}',
  'user-123',
  '2023-10-27T10:00:00Z', '2023-10-27T10:00:00Z', 1
);

-- Insert a child "task" item for the project above
INSERT INTO crudl_items (
  "type", "id",
  "parentType", "parentId",
  "data", "meta",
  "user",
  "createdAt", "updatedAt", "version"
) VALUES (
  'task',
  'task-001',
  'project', 'proj-alpha',
  '{"title": "Set up CI/CD pipeline", "status": "todo", "assignee": "user-123"}',
  '{"estimatedHours": 8}',
  'user-123',
  '2023-10-27T10:05:00Z', '2023-10-27T10:05:00Z', 1
);

-- Insert another child "task" for the same project
INSERT INTO crudl_items (
  "type", "id",
  "parentType", "parentId",
  "data", "meta",
  "user",
  "createdAt", "updatedAt", "version"
) VALUES (
  'task',
  'task-002',
  'project', 'proj-alpha',
  '{"title": "Design database schema", "status": "in-progress", "assignee": "user-456"}',
  '{"estimatedHours": 16, "dependencies": ["task-001"]}',
  'user-123',
  '2023-10-27T10:10:00Z', '2023-10-27T11:00:00Z', 2
);

-- Insert a top-level "project" for a different user, user-456
INSERT INTO crudl_items (
  "type", "id",
  "parentType", "parentId",
  "data", "meta",
  "user",
  "createdAt", "updatedAt", "version"
) VALUES (
  'project',
  'proj-beta',
  NULL, NULL,
  '{"name": "Beta Initiative", "status": "planning", "description": "A new initiative for the Q2 roadmap."}',
  '{"priority": "medium", "tags": ["backend", "api"]}',
  'user-456',
  '2023-10-27T12:00:00Z', '2023-10-27T12:00:00Z', 1
);

-- Insert a standalone "note" item for user-123
INSERT INTO crudl_items (
  "type", "id",
  "parentType", "parentId",
  "data", "meta",
  "user",
  "createdAt", "updatedAt", "version"
) VALUES (
  'note',
  'note-general-01',
  NULL, NULL,
  '{"content": "Remember to check the D1 database bindings in wrangler.toml.", "isPinned": true}',
  '{"category": "reminder"}',
  'user-123',
  '2023-10-27T09:00:00Z', '2023-10-27T09:00:00Z', 1
);

-- Insert a "comment" as a child of a task
INSERT INTO crudl_items (
  "type", "id",
  "parentType", "parentId",
  "data", "meta",
  "user",
  "createdAt", "updatedAt", "version"
) VALUES (
  'comment',
  'comment-001',
  'task', 'task-002',
  '{"text": "I have started looking into the schema. I will have a draft ready by EOD.", "author": "user-456"}',
  '{"isEdited": false}',
  'user-456',
  '2023-10-27T13:15:00Z', '2023-10-27T13:15:00Z', 1
);
