// TypeScript type definitions for VFF Cloudflare API
// Updated for relational database structure

export interface ItemData {
  [key: string]: any
}

export interface ItemMeta {
  createdAt: string
  updatedAt: string
  version: number
}

export interface BaseItem {
  type: string
  id: string
  parentType?: string
  parentId?: string
  data?: ItemData
  meta?: ItemMeta
  user?: string // User identifier
}

export interface QueryResponse {
  items: BaseItem[]
  nextOffset: number
}

// Database row interface (internal)
export interface DbItem {
  type: string
  id: string
  parentType?: string
  parentId?: string
  data: string // JSON string
  user: string
  createdAt: string
  updatedAt: string
  version: number
}

// Request/Response types for handlers
export interface CreateItemRequest extends Partial<BaseItem> {
  type: string
}

export interface UpdateItemRequest {
  [key: string]: any
}

// Error types
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// D1 Database interface (Cloudflare Workers)
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  dump(): Promise<ArrayBuffer>
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
  exec(query: string): Promise<D1ExecResult>
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement
  first<T = any>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = any>(): Promise<D1Result<T>>
  raw<T = any>(): Promise<T[]>
}

export interface D1Result<T = any> {
  results?: T[]
  success: boolean
  error?: string
  meta: {
    duration: number
    size_after: number
    rows_read: number
    rows_written: number
  }
}

export interface D1ExecResult {
  count: number
  duration: number
}

// Environment bindings for Cloudflare Workers
export interface Env {
  DB: D1Database
  ENVIRONMENT?: string
}

// Pagination options
export interface PaginationOptions {
  limit?: number
  offset?: number
}

// Database service options
export interface CreateItemOptions {
  id?: string
  data?: any
  parentType?: string
  parentId?: string
  userId?: string
}

export interface UpdateItemOptions {
  merge?: boolean
}

export interface ListChildrenOptions extends PaginationOptions {
  // Additional options can be added here
}

export interface ListUserItemsOptions extends PaginationOptions {
  // Additional options can be added here
}