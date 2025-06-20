# VFF Cloudflare Workers Backend

This document describes the Cloudflare Workers backend implementation for the VFF (Vue Frontend Framework) application. The backend maintains exact API compatibility with the existing AWS implementation while leveraging Cloudflare's edge computing platform.

## Architecture Overview

The backend is built using:
- **Cloudflare Workers** - Serverless edge computing platform
- **Hono** - Fast, lightweight web framework for Workers
- **D1 Database** - Cloudflare's SQLite-based serverless database
- **TypeScript** - Full type safety throughout the application

## Project Structure

```
api/
├── index.ts              # Main worker entry point
├── schema.sql            # D1 database schema
├── types/api.ts          # TypeScript type definitions
├── services/database.ts  # Database service with CRUDL operations
├── handlers/items.ts     # HTTP request handlers
├── routes/api.ts         # API route definitions
└── middleware/
    ├── auth.ts           # Authentication middleware
    └── error.ts          # Error handling middleware
wrangler.jsonc            # Cloudflare Workers configuration
```

## API Endpoints

The backend maintains exact compatibility with the existing AWS implementation:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/v1/{type}` | Create new item |
| GET    | `/api/v1/{type}/{id}` | Get single item by type and ID |
| PUT    | `/api/v1/{type}/{id}` | Update existing item |
| DELETE | `/api/v1/{type}/{id}` | Delete item |
| GET    | `/api/v1/{parentType}/{parentId}/{childType}` | Get children of specific type for parent |
| GET    | `/api/v1/user/{type}` | Get items of type for current user |

### Additional Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/health` | Health check endpoint |
| GET    | `/debug` | Debug information (development only) |
| GET    | `/` | API documentation and info |

## Database Schema

The D1 database uses a relational structure with separate columns instead of composite keys:

```sql
CREATE TABLE items (
  type TEXT NOT NULL,             -- Item type (e.g., "project", "task")
  id TEXT NOT NULL,               -- Unique identifier for the item
  parentType TEXT,                -- Type of the parent item
  parentId TEXT,                  -- ID of the parent item
  data TEXT,                      -- JSON string containing item data
  user TEXT,                      -- User ID for authorization
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Creation timestamp
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Last update timestamp
  version INTEGER DEFAULT 1,      -- Version for optimistic locking
  PRIMARY KEY (type, id)
);
```

### Indexes

- `PRIMARY KEY (type, id)` - Primary key for efficient item lookups
- `idx_parent` - Index on `(parentType, parentId)` for parent-child queries
- `idx_user_type` - Index on `(user, type)` for user-specific type queries
- `idx_user` - Index on `user` for user-specific queries
- `idx_type` - Index on `type` for type-specific queries

### Key Differences from Previous Version

- **Separate Columns**: Instead of composite `pk`/`sk` keys, uses separate `type`, `id`, `parentType`, `parentId` columns
- **Direct Timestamps**: `createdAt` and `updatedAt` are separate columns, not stored in JSON metadata
- **Version Column**: Separate `version` column for optimistic locking
- **Relational Structure**: More SQL-native approach for better query performance

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Wrangler

Update `wrangler.jsonc` with your specific configuration:

```jsonc
{
  "name": "your-worker-name",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-database-name",
      "database_id": "your-database-id"
    }
  ],
  "routes": [
    {
      "pattern": "your-domain.com/api/v1/*",
      "zone_name": "your-domain.com"
    }
  ]
}
```

### 3. Create D1 Database

```bash
# Create the database
npm run db:create

# Apply the schema
npm run db:migrate
```

### 4. Development

```bash
# Start local development server
npm run worker:dev

# For local database development
npm run db:migrate:local
```

### 5. Deployment

```bash
# Deploy to Cloudflare
npm run worker:deploy
```

## Database Operations

### CRUDL Functions

The `DatabaseService` class provides all necessary database operations:

- `createItem()` - Create items with parent-child relationships
- `readItem()` - Read single items by type and ID
- `updateItem()` - Update items with optional merge capability
- `deleteItem()` - Delete items
- `listChildren()` - List child items with pagination
- `listUserItems()` - List user items with pagination

### Data Structure

The system uses a relational approach:

- **Primary Key**: `(type, id)` - Composite primary key for unique item identification
- **Parent Relationship**: `parentType` and `parentId` columns for hierarchical data
- **User Association**: `user` column for authorization and user-specific queries

## Pagination

The system supports both offset-based and cursor-based pagination:

### Offset-based Pagination
```
GET /api/v1/user/project?limit=20&offset=40
```

### Cursor-based Pagination
```
GET /api/v1/user/project?limit=20&nextCursor=base64-encoded-cursor
```

## Authentication

The current implementation includes a placeholder authentication system that will be enhanced with OpenAuth integration:

### Current Authentication

- Header-based authentication for development
- `X-User-ID`, `X-User-Email`, `X-User-Name` headers
- Fallback to `not-logged-in` for unauthenticated requests

### Future Enhancement

- OpenAuth integration for production authentication
- JWT token validation
- Role-based access control
- Permission management

## Error Handling

Comprehensive error handling with standardized responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## Response Formats

### Single Item Response (CRUD operations)
```json
{
  "item": {
    "type": "project",
    "id": "uuid",
    "parentType": "user",
    "parentId": "userId",
    "data": { "name": "My Project" },
    "meta": {
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "version": 1
    },
    "user": "userId"
  }
}
```

### List Response (List operations)
```json
{
  "items": [
    {
      "type": "project",
      "id": "uuid",
      "parentType": "user",
      "parentId": "userId",
      "data": { "name": "My Project" },
      "meta": {
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "version": 1
      },
      "user": "userId"
    }
  ],
  "nextCursor": "base64-encoded-cursor"
}
```

## Performance Considerations

- **Edge Computing**: Runs on Cloudflare's global edge network
- **D1 Database**: SQLite-based with automatic replication
- **Caching**: Leverages Cloudflare's caching infrastructure
- **Efficient Indexes**: Optimized indexes for common query patterns
- **Pagination**: Both offset and cursor-based pagination for different use cases

## Development vs Production

### Development
- Local D1 database for testing
- Debug endpoints enabled
- Verbose logging
- CORS configured for local development

### Production
- Global D1 database with replication
- Debug endpoints disabled
- Optimized logging
- Production CORS configuration

## Migration from Composite Key Structure

The backend has been refactored from a DynamoDB-style composite key approach to a more relational structure:

### Key Changes
1. **Separate Columns**: `type`, `id`, `parentType`, `parentId` instead of `pk`/`sk`
2. **Direct Timestamps**: `createdAt`/`updatedAt` as columns instead of JSON metadata
3. **Version Column**: Separate `version` column for better performance
4. **Relational Indexes**: SQL-native indexes for better query optimization

### Benefits
- **Better Performance**: Native SQL queries and indexes
- **Easier Maintenance**: More intuitive relational structure
- **Improved Scalability**: Better suited for D1's SQLite engine
- **Enhanced Debugging**: Clearer data structure for troubleshooting

## Next Steps

1. **OpenAuth Integration**: Replace placeholder authentication
2. **Advanced Permissions**: Implement role-based access control
3. **Caching Strategy**: Optimize with Cloudflare caching
4. **Monitoring**: Add comprehensive logging and metrics
5. **Testing**: Implement comprehensive test suite

## Support

For questions or issues with the Cloudflare Workers backend implementation, please refer to:

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework Documentation](https://hono.dev/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)