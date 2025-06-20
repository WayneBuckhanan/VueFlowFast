// Error handling middleware for VFF Cloudflare Backend
// Provides consistent error responses and logging

import { Context } from 'hono'
import { ApiError } from '../types/api'

export interface ErrorResponse {
  error: {
    message: string
    code?: string
    status: number
  }
  timestamp: string
  path?: string
}

// Error handler middleware
export const errorHandler = async (err: Error, c: Context): Promise<Response> => {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString()
  })

  let status = 500
  let message = 'Internal Server Error'
  let code: string | undefined

  if (err instanceof ApiError) {
    status = err.status
    message = err.message
    code = err.code
  } else if (err.name === 'ValidationError') {
    status = 400
    message = 'Invalid request data'
    code = 'VALIDATION_ERROR'
  } else if (err.message.includes('not found')) {
    status = 404
    message = 'Resource not found'
    code = 'NOT_FOUND'
  } else if (err.message.includes('unauthorized') || err.message.includes('forbidden')) {
    status = 401
    message = 'Unauthorized'
    code = 'UNAUTHORIZED'
  }

  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      status
    },
    timestamp: new Date().toISOString(),
    path: c.req.path
  }

  return c.json(errorResponse, status as any)
}

// Helper function to create standardized error responses
export const createErrorResponse = (
  status: number, 
  message: string, 
  code?: string
): ErrorResponse => {
  return {
    error: {
      message,
      code,
      status
    },
    timestamp: new Date().toISOString()
  }
}

// Common error creators
export const notFoundError = (resource: string = 'Resource') => 
  new ApiError(404, `${resource} not found`, 'NOT_FOUND')

export const validationError = (message: string = 'Invalid request data') => 
  new ApiError(400, message, 'VALIDATION_ERROR')

export const unauthorizedError = (message: string = 'Unauthorized') => 
  new ApiError(401, message, 'UNAUTHORIZED')

export const forbiddenError = (message: string = 'Forbidden') => 
  new ApiError(403, message, 'FORBIDDEN')

export const internalServerError = (message: string = 'Internal Server Error') => 
  new ApiError(500, message, 'INTERNAL_SERVER_ERROR')

// Validation helpers
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw validationError(`${fieldName} is required`)
  }
}

export const validateType = (value: any, expectedType: string, fieldName: string): void => {
  if (typeof value !== expectedType) {
    throw validationError(`${fieldName} must be of type ${expectedType}`)
  }
}