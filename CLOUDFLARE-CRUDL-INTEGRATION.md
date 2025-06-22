# Cloudflare CRUDL Integration Guide

This guide provides step-by-step instructions for integrating the Cloudflare-backed generic CRUDL (Create, Read, Update, Delete, List) interface into a starter Vue + Vue Router project.

## Overview

This integration provides:
- **Generic CRUDL API**: RESTful endpoints for any data type with hierarchical relationships
- **Email-based Authentication**: Passwordless login with verification codes
- **Cloudflare D1 Database**: Serverless SQLite database
- **Cloudflare Workers**: Edge-deployed API backend
- **Vue 3 Frontend**: Modern Vue.js with Composition API and TypeScript support

## Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers and D1 access
- Existing Vue + Vue Router project (or create new one)

## Required Packages

Install the following dependencies:

```bash
# Core Cloudflare and backend dependencies
npm install @cloudflare/vite-plugin @cloudflare/workers-types hono wrangler

# Vue ecosystem packages
npm install pinia vue-router

# UI Framework (PrimeVue - optional but recommended)
npm install primevue @primeuix/themes primeicons @primevue/auto-import-resolver

# Styling (TailwindCSS - optional but recommended)
npm install tailwindcss @tailwindcss/vite tailwindcss-primeui

# Auto-import utilities
npm install unplugin-auto-import unplugin-vue-components unplugin-vue-router

# Utilities
npm install uuid pug

# Development dependencies
npm install --save-dev vitest @vitest/coverage-v8 msw @cloudflare/vitest-pool-workers
```

## Directory Structure

Your project should have the following structure after integration:

```
your-project/
├── api/                          # Cloudflare Workers API
│   ├── index.ts                  # Main worker entry point
│   ├── schema.sql                # Database schema
│   ├── handlers/
│   │   └── items.ts              # CRUDL handlers
│   ├── middleware/
│   │   ├── auth.ts               # Authentication middleware
│   │   └── error.ts              # Error handling middleware
│   ├── routes/
│   │   ├── api.ts                # API routes
│   │   └── auth.ts               # Authentication routes
│   ├── services/
│   │   ├── auth.ts               # Authentication service
│   │   ├── database.ts           # Database service
│   │   └── email.ts              # Email service
│   └── types/
│       └── api.ts                # TypeScript types
├── src/
│   ├── api.ts                    # Frontend API client
│   ├── stores/
│   │   └── auth.ts               # Pinia auth store
│   └── components/
│       └── auth/                 # Authentication components
│           ├── AuthModal.vue
│           ├── LoginForm.vue
│           └── VerifyCodeForm.vue
├── wrangler.jsonc                # Cloudflare configuration
└── package.json                  # Updated dependencies
```

## Files to Copy

### 1. API Backend Files (Complete Directory)

Copy the entire [`api/`](api/) directory to your project root:

- [`api/index.ts`](api/index.ts) - Main Cloudflare Worker entry point
- [`api/schema.sql`](api/schema.sql) - Database schema with authentication tables
- [`api/handlers/items.ts`](api/handlers/items.ts) - Generic CRUDL handlers
- [`api/middleware/auth.ts`](api/middleware/auth.ts) - Authentication middleware
- [`api/middleware/error.ts`](api/middleware/error.ts) - Error handling
- [`api/routes/api.ts`](api/routes/api.ts) - API route definitions
- [`api/routes/auth.ts`](api/routes/auth.ts) - Authentication routes
- [`api/services/auth.ts`](api/services/auth.ts) - Authentication service
- [`api/services/database.ts`](api/services/database.ts) - Database operations
- [`api/services/email.ts`](api/services/email.ts) - Email service (Mailjet)
- [`api/types/api.ts`](api/types/api.ts) - TypeScript type definitions

### 2. Frontend Integration Files

Copy these files to your [`src/`](src/) directory:

- [`src/api.ts`](src/api.ts) - Frontend API client with CRUDL methods
- [`src/stores/auth.ts`](src/stores/auth.ts) - Pinia authentication store

### 3. Authentication Components

Copy the authentication components to [`src/components/auth/`](src/components/auth/):

- [`src/components/auth/AuthModal.vue`](src/components/auth/AuthModal.vue) - Main auth modal
- [`src/components/auth/LoginForm.vue`](src/components/auth/LoginForm.vue) - Email input form
- [`src/components/auth/VerifyCodeForm.vue`](src/components/auth/VerifyCodeForm.vue) - Code verification form

### 4. Configuration Files

Copy these configuration files to your project root:

- [`wrangler.jsonc`](wrangler.jsonc) - Cloudflare Workers configuration
- [`vitest.config.js`](vitest.config.js) - Testing configuration (optional)

## Configuration Updates

### 1. Update `package.json`

Add these scripts to your [`package.json`](package.json):

```json
{
  "scripts": {
    "worker:dev": "wrangler dev",
    "worker:deploy": "wrangler deploy",
    "db:create": "wrangler d1 create your-database-name",
    "db:migrate": "wrangler d1 execute your-database-name --file=./api/schema.sql",
    "db:migrate:local": "wrangler d1 execute your-database-name --local --file=./api/schema.sql",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 2. Update `vite.config.js`

Modify your Vite configuration to include the necessary plugins:

```javascript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import TailwindCSS from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    VueRouter({
      routeBlockLang: 'yaml',
    }),
    Vue(),
    cloudflare(),
    TailwindCSS(),
    Components({
      resolvers: [
        PrimeVueResolver(),
      ],
    }),
    AutoImport({ 
      imports: [
        'vue', 
        'pinia',
        VueRouterAutoImports,
      ]
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 650,
  },
})
```

### 3. Update `src/main.js`

Modify your main Vue entry point to include Pinia and PrimeVue:

```javascript
import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

// Pinia store
import { createPinia } from 'pinia'
const pinia = createPinia()
app.use(pinia)

// Vue Router with unplugin-vue-router
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
if(import.meta.hot) {
  handleHotUpdate(router)
}
app.use(router)

// PrimeVue (optional)
import PrimeVue from 'primevue/config'
import Theme from '@primeuix/themes/lara'
app.use(PrimeVue, {
  theme: {
    preset: Theme,
    options: {
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue, components, utilities'
      }
    }
  }
})

// Toast service for notifications (optional)
import ToastService from 'primevue/toastservice'
app.use(ToastService)

// Your app styles
import './index.css'

// Initialize auth store on app startup
import { useAuthStore } from './stores/auth'
app.mount('#app')

// Initialize authentication state after app is mounted
const authStore = useAuthStore()
authStore.initialize().catch(error => {
  console.warn('Failed to initialize auth state:', error)
})
```

## Cloudflare Setup

### 1. Create D1 Database

```bash
# Create the database
npm run db:create

# Note the database ID from the output and update wrangler.jsonc
```

### 2. Update `wrangler.jsonc`

Update the configuration with your specific values:

```json
{
  "name": "your-app-api",
  "main": "./api/index.ts",
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "compatibility_date": "2025-06-20",
  "vars": {
    "ENVIRONMENT": "development",
    "MAILJET_API_KEY": "your-mailjet-api-key",
    "MAILJET_SECRET_KEY": "your-mailjet-secret-key",
    "FROM_EMAIL": "noreply@yourdomain.com",
    "FROM_NAME": "Your App Name"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-database-name",
      "database_id": "your-database-id-from-step-1"
    }
  ],
  "routes": [
    {
      "pattern": "*/api/v1/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

### 3. Initialize Database

```bash
# Run database migrations
npm run db:migrate:local  # For local development
npm run db:migrate        # For production
```

### 4. Set up Email Service

The system uses Mailjet for sending verification codes. Sign up at [Mailjet](https://www.mailjet.com/) and get your API credentials, then update the `vars` section in `wrangler.jsonc`.

## Usage Examples

### 1. Authentication

```vue
<template>
  <div>
    <AuthModal v-if="!authStore.isAuthenticated" />
    <div v-else>
      <p>Welcome, {{ authStore.user?.email }}!</p>
      <button @click="authStore.logout()">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import AuthModal from '@/components/auth/AuthModal.vue'

const authStore = useAuthStore()
</script>
```

### 2. CRUDL Operations

```vue
<script setup>
import { api } from '@/api'

// Create an item
const createProject = async () => {
  const project = await api.createItem({
    type: 'project',
    id: 'proj-123',
    data: { name: 'My Project', description: 'A sample project' }
  })
}

// Read an item
const getProject = async () => {
  const project = await api.getItem('project', 'proj-123')
}

// Update an item
const updateProject = async () => {
  const updated = await api.updateItem('project', 'proj-123', {
    name: 'Updated Project Name'
  })
}

// Delete an item
const deleteProject = async () => {
  await api.deleteItem('project', 'proj-123')
}

// List user's items
const getUserProjects = async () => {
  const response = await api.getUserData('project')
  const projects = response.items
}

// List child items
const getProjectTasks = async () => {
  const response = await api.getChildren('project', 'proj-123', 'task')
  const tasks = response.items
}
</script>
```

## API Endpoints

The system provides these RESTful endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Send verification code to email |
| `POST` | `/auth/verify` | Verify code and authenticate |
| `GET` | `/auth/me` | Get current user info |
| `POST` | `/auth/logout` | Logout and clear session |
| `POST` | `/api/v1/{type}` | Create new item |
| `GET` | `/api/v1/{type}/{id}` | Get single item |
| `PUT` | `/api/v1/{type}/{id}` | Update existing item |
| `DELETE` | `/api/v1/{type}/{id}` | Delete item |
| `GET` | `/api/v1/{parentType}/{parentId}/{childType}` | Get child items |
| `GET` | `/api/v1/user/{type}` | Get user's items |

## Development Workflow

1. **Local Development**:
   ```bash
   npm run dev          # Start Vue dev server
   npm run worker:dev   # Start Cloudflare Workers dev server
   ```

2. **Testing**:
   ```bash
   npm run test         # Run tests
   npm run test:coverage # Run with coverage
   ```

3. **Deployment**:
   ```bash
   npm run build        # Build Vue app
   npm run worker:deploy # Deploy to Cloudflare
   ```

## Data Model

The system uses a flexible, hierarchical data model:

```typescript
interface BaseItem {
  type: string        // Item type (e.g., 'project', 'task')
  id: string         // Unique identifier
  parentType?: string // Parent item type
  parentId?: string  // Parent item ID
  data?: any         // Flexible JSON data
  user?: string      // Owner user ID
  meta?: {           // System metadata
    createdAt: string
    updatedAt: string
    version: number
  }
}
```

## Security Features

- **Session-based Authentication**: HTTP-only cookies for security
- **Email Verification**: Passwordless login with time-limited codes
- **User Isolation**: All data is scoped to authenticated users
- **CORS Protection**: Configured for your domains
- **Input Validation**: Server-side validation for all inputs

## Customization

### Adding New Item Types

Simply use any `type` string in your API calls. The system is completely generic:

```javascript
// Create a custom item type
await api.createItem({
  type: 'custom-type',
  id: 'item-1',
  data: { customField: 'value' }
})
```

### Extending Authentication

Modify [`api/services/auth.ts`](api/services/auth.ts) to add additional authentication providers or user fields.

### Custom Validation

Add validation logic in [`api/handlers/items.ts`](api/handlers/items.ts) for specific item types.

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure D1 database is created and ID is correct in `wrangler.jsonc`
2. **CORS Errors**: Update allowed origins in [`api/index.ts`](api/index.ts)
3. **Email Not Sending**: Verify Mailjet credentials in `wrangler.jsonc`
4. **Authentication Issues**: Check browser cookies and session storage

### Debug Endpoints

- `GET /health` - Check API health
- `GET /debug` - View request headers and environment

## Testing

The integration includes comprehensive tests:

- [`tests/api.test.js`](tests/api.test.js) - API endpoint tests
- [`tests/auth.test.js`](tests/auth.test.js) - Authentication tests  
- [`tests/database.test.js`](tests/database.test.js) - Database operation tests

Run tests with:
```bash
npm run test
```

## Support

This integration provides a complete, production-ready CRUDL system with authentication. The generic nature allows it to handle any data structure while maintaining type safety and security.

For additional customization or issues, refer to the individual component files and their inline documentation.