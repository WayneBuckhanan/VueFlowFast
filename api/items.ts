/*
Primary endpoints:
| Method Path                                        | Handler             | Request DTO        | Response code, DTO   | Index | Description     |
|----------------------------------------------------|---------------------|--------------------|----------------------|-------|-----------------|
| POST   /api/v1/{type}                              | handleCreateItem    | CreateItemRequest  | 201 ItemResponse     |       | Create new item |
| GET    /api/v1/{type}/{id}                         | handleReadItem      | N/A                | 200 ItemResponse     | SKPK  | Get single item by type and ID |
| PUT    /api/v1/{type}/{id}                         | handleUpdateItem    | UpdateItemRequest  | 200 ItemResponse     |       | Update existing item |
| DELETE /api/v1/{type}/{id}                         | handleDeleteItem    | N/A                | 200 <any>            |       | Delete item |
| GET    /api/v1/{parentType}/{parentId}/{childType} | handleListChildren   | N/A                | 200 QueryResponse   |       | Get children of specific type (or 'all') for parent, pagination via ?limit&nextCursor |
| GET    /api/v1/user/{type}                         | handleListUserItems  | N/A                | 200 QueryResponse   | USER  | Get items of type (or 'all') for current user, pagination via ?limit&nextCursor |
*/

/*
Deferred endpoints:
| Method Path                                        | Handler             | Request DTO        | Response code, DTO   | Index | Description |
|----------------------------------------------------|---------------------|--------------------|----------------------|-------|-------------|
| GET    /api/v1/{type}                              | handleQueryItems    | N/A                | 200 QueryResponse    | SKPK  | Query items by type (matching sk with no #id) |
| GET    /api/v1/{type}/{id}/ancestry                | handleGetAncestry   | N/A                | 200 AncestryResponse | SKPK  | Get item ancestry chain |
| POST   /api/v1/query                               | handleAdvancedQuery | QueryRequest       | 200 QueryResponse    | ????  | Advanced query with complex filters |
*/

/*
This API is built on top of a single-table DynamoDB where pk and sk are composite keys with `${type}#${id}` values for hierarchical parent-child relationships.

The table has pk, sk, data, meta, user (Cognito uuid) columns and two GSIs: SKPK of sk,pk and USER of user,sk.

Since we are using the type#id pattern for keys with parent being in pk and child in sk, we can easily drill down the hierarchy. We assume the USER#${cognitoUserId} is the root pk since we always know which logged in user is making the request. If we tried to insert an item without parent info, we'd put it under the USER#id parent so there are no orphans. Otherwise, we'll be inserting with parentType#parentId, childType#childId.
With the SKPK index, we can work our way upward or retrieve a specific item by type+id without needing to know its parent type and id.
We can also use the USER index to retrieve all data for that user or just data of a given type (the beginning of the sk value) for that user.
*/

/*
Directly callable functions

| Return value           | Function Signature |
|------------------------|--------------------|
| Promise<ItemResponse>  | createItem(type, options?: { id?, data?, parentType?, parentId?, userId? }) |
| Promise<ItemResponse>  | readItem(type, id) |
| Promise<ItemResponse>  | updateItem(type, id, data, options?: { merge? }) |
| Promise<any>           | deleteItem(type, id, userId?) |
| Promise<QueryResponse> | listChildren(parentType, parentId, childType?, options?: { limit?, nextCursor? }) |
| Promise<QueryResponse> | listUserItems(userId, type?, options?: { limit?, nextCursor? }) |

export async function createItem(
  type: string,
  options?: {
    id?: string, // will create UUID if none passed in
    data?: any,
    parentType?: string, // defaults to 'user'
    parentId?: string, // defaults to userId
    userId?: string // needed if missing parent type or id
  }
): Promise<API.ItemResponse>

export async function readItem(
  type: string,
  id: string
): Promise<API.ItemResponse>

export async function updateItem(
  type: string,
  id: string,
  data: any,
  options?: {
    merge?: boolean // true: use `data` as overlay on stored value
                    // false: replace stored value with `data`
  }
): Promise<API.ItemResponse>

export async function deleteItem(
  type: string,
  id: string,
  userId?: string // needed if we're missing parent type or id in stored value
): Promise<void>

export async function listChildren(
  parentType: string,
  parentId: string,
  childType?: string, // defaults to 'all'
  options?: {
    limit?: number,
    nextCursor?: string // for pagination
  }
): Promise<API.QueryResponse>

export async function listUserItems(
  userId: string,
  type?: string, // defaults to 'all'
  options?: {
    limit?: number,
    nextCursor?: string // for pagination
  }
): Promise<API.QueryResponse>
*/

import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  AttributeValue
} from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { v4 as uuidv4 } from 'uuid'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import type * as API from '@src/api.ts'

// Utility Functions for DynamoDB Key Management and Item Operations
export function createPK(type: string, id: string, parentType?: string, parentId?: string, userId?: string): string {
  if (parentType && parentId) {
    return `${parentType?.toUpperCase()}#${parentId}`
  }
  if(type && id) {
    return `${type?.toUpperCase()}#${id}`
  }
  return `USER#${userId}`
}

export function createSK(type: string, id?: string, pk?: string): string {
  const typeSk = type?.toUpperCase()
  const defaultSk = `${typeSk}#${id}`
  // If pk and sk would be identical, return just the type so we can look it up by type via the SKPK index
  if (pk && pk === defaultSk) {
    return typeSk
  }
  if(id) {
    return defaultSk
  } else {
    return typeSk
  }
}

export function parseKey(pk: string): { type: string; id?: string } {
  const [type, id] = pk.split('#')
  return { type, id }
}

// Response Helper
function apiResponse(status: number, body: any, headers?: Record<string, string>): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
      ...headers
    },
    body: JSON.stringify(body)
  }
}

// DynamoDB Client
const dynamoClient = new DynamoDBClient({})
import { Resource } from 'sst'
const TABLE_NAME = Resource['Data']?.name

function dynamoToType(dyn) {
  const item = unmarshall(dyn)
  const [ parentType, parentId ] = item.pk?.split("#")
  const [ type, id ] = item.sk?.split("#")
  const { data, meta, user } = item
  return {
    type, id,
    parentType, parentId,
    data: data ? JSON.parse(data) : {},
    meta,
    user,
  }
}

// Helper Functions for Generic CRUDL to DynamoDB access
export async function createItem(
  type: string,
  options?: {
    id?: string,
    data?: any,
    parentType?: string,
    parentId?: string,
    userId?: string
  }
): Promise<API.ItemResponse> {
  const { data, userId = 'not-logged-in' } = options || {}
  let { id, parentType, parentId } = options || {}
  if(!id) {
    id = uuidv4()
  }
  if(!options.parentType || !options.parentId) {
    parentType = 'user'
    parentId = userId
  }
  const pk = createPK(type, id, parentType, parentId, userId)
  const sk = createSK(type, id, pk)
  const now = new Date().toISOString()
  const meta: ItemMeta = {
    createdAt: now,
    updatedAt: now,
    version: 1
  }
  const item = {
    pk,
    sk,
    data: JSON.stringify(data || {}),
    meta,
    user: userId
  }

  //console.log("createItem", item, { type, id, parentType, parentId, data, meta, user: userId })
  await dynamoClient.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: marshall(item, {removeUndefinedValues: true})
  }))

  return { items: [{ type, id, parentType, parentId, data, meta, user: userId }] }
}

export async function readItem(
  type: string,
  id: string
): Promise<API.ItemResponse> {
  const sk = createSK(type, id)

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: 'SKPK',
    KeyConditionExpression: 'sk = :sk',
    ExpressionAttributeValues: {
      ':sk': { S: sk }
    }
  }

  const { Items } = await dynamoClient.send(new QueryCommand(queryParams))
  const item = Items?.[0] ? dynamoToType(Items[0]) : null
  return { items: item ? [item] : [] }
}

export async function updateItem(
  type: string,
  id: string,
  data: any,
  options?: { merge?: boolean }
): Promise<API.ItemResponse> {
  const itemResponse = await readItem(type, id)
  const item = itemResponse.items[0]
  if (!item) {
    throw new Error('Item not found')
  }

  let updatedData = data
  if (options?.merge) {
    updatedData = { ...item.data, ...data }
  }

  const now = new Date().toISOString()
  const updateExpression = 'SET #data = :data, #meta.#updatedAt = :updatedAt, #meta.#version = #meta.#version + :increment'
  const expressionAttributeNames = {
    '#data': 'data',
    '#meta': 'meta',
    '#updatedAt': 'updatedAt',
    '#version': 'version'
  }
  const expressionAttributeValues = {
    ':data': { S: JSON.stringify(updatedData || {}) },
    ':updatedAt': { S: now },
    ':increment': { N: '1' }
  }

  const pk = item?.pk || createPK(type, id, item.parentType, item.parentId)
  const sk = item?.sk || createSK(type, id, pk)
  const updateParams = {
    TableName: TABLE_NAME,
    Key: marshall({ pk: pk, sk: sk }),
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }

  const { Attributes } = await dynamoClient.send(new UpdateItemCommand(updateParams))
  if (!Attributes) {
    throw new Error('Item not found')
  }

  return { items: [dynamoToType(Attributes)] }
}

export async function deleteItem(
  type: string,
  id: string,
  userId?: string
): Promise<void> {
  const itemResponse = await readItem(type, id)
  const item = itemResponse.items[0]
  if (!item) {
    throw new Error('Item not found')
  }

  const pk = item?.pk || createPK(type, id, item.parentType, item.parentId, userId)
  const sk = item?.sk || createSK(type, id, pk)

  return dynamoClient.send(new DeleteItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ pk: pk, sk: sk }, {removeUndefinedValues: true})
  }))
}

export async function listChildren(
  parentType: string,
  parentId: string,
  childType?: string,
  options?: {
    limit?: number,
    nextCursor?: string
  }
): Promise<API.QueryResponse> {
  const { limit = 50, nextCursor } = options || {}

  const baseQueryParams = {
    TableName: TABLE_NAME,
    Limit: limit,
    KeyConditionExpression: 'pk = :pk' + (childType && childType !== 'all' ? ' AND begins_with(sk, :sk)' : ''),
    ExpressionAttributeValues: {
      ':pk': { S: createPK(null, null, parentType, parentId) },
      ...(childType && childType !== 'all' ? { ':sk': { S: childType?.toUpperCase() } } : {})
    }
  }

  if (nextCursor) {
    baseQueryParams['ExclusiveStartKey'] = marshall(JSON.parse(Buffer.from(nextCursor, 'base64').toString('utf-8')))
  }

  const { Items, LastEvaluatedKey } = await dynamoClient.send(new QueryCommand(baseQueryParams))

  const items = Items ? Items.map(item => dynamoToType(item)) : []
  const responseNextCursor = LastEvaluatedKey
    ? Buffer.from(JSON.stringify(unmarshall(LastEvaluatedKey))).toString('base64')
    : undefined

  return { items, nextCursor: responseNextCursor }
}

export async function listUserItems(
  userId: string,
  type?: string,
  options?: {
    limit?: number,
    nextCursor?: string
  }
): Promise<API.QueryResponse> {
  const { limit = 50, nextCursor } = options || {}

  const baseQueryParams = {
    TableName: TABLE_NAME,
    IndexName: 'USER',
    Limit: limit,
    KeyConditionExpression: '#user = :user' + (type && type !== 'all' ? ' AND begins_with(sk, :type)' : ''),
    ExpressionAttributeNames: {
      '#user': 'user'
    },
    ExpressionAttributeValues: {
      ':user': { S: userId },
      ...(type && type !== 'all' ? { ':type': { S: type.toUpperCase() } } : {})
    }
  }

  if (nextCursor) {
    baseQueryParams['ExclusiveStartKey'] = marshall(JSON.parse(Buffer.from(nextCursor, 'base64').toString('utf-8')))
  }

  const { Items, LastEvaluatedKey } = await dynamoClient.send(new QueryCommand(baseQueryParams))

  const items = Items ? Items.map(item => dynamoToType(item)) : []
  const responseNextCursor = LastEvaluatedKey
    ? Buffer.from(JSON.stringify(unmarshall(LastEvaluatedKey))).toString('base64')
    : undefined

  return { items, nextCursor: responseNextCursor }
}

// Handler Functions
export async function handleCreateItem(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const { data, type, id, parentType, parentId } = JSON.parse(event.body || '{}')
    const userId = event.requestContext.authorizer?.jwt?.claims.sub || 'not-logged-in'

    const response = await createItem(type || event.pathParameters.type, {
      id,
      data,
      parentType,
      parentId,
      userId
    })

    return apiResponse(201, response)
  } catch (error) {
    console.error(error)
    return apiResponse(500, { message: 'Internal Server Error' })
  }
}

export async function handleReadItem(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const { type, id } = event.pathParameters || {}
    const response = await readItem(type!, id!)

    if (response.items.length === 0) {
      return apiResponse(404, { message: 'Item not found' })
    }

    return apiResponse(200, response)
  } catch (error) {
    console.error(error)
    return apiResponse(500, { message: 'Internal Server Error' })
  }
}

export async function handleUpdateItem(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const { type, id } = event.pathParameters || {}
    const data = JSON.parse(event.body || '{}')
    const query = new URLSearchParams(event.rawQueryString)
    const merge = query.get('merge') === 'true' || query.get('merge') === ''
    const response = await updateItem(type!, id!, data, { merge })

    return apiResponse(200, response)
  } catch (error) {
    console.error(error)
    return apiResponse(500, { message: 'Internal Server Error' })
  }
}

export async function handleDeleteItem(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const { type, id } = event.pathParameters || {}
    const userId = event.requestContext.authorizer?.jwt?.claims.sub || 'not-logged-in'

    const response = await deleteItem(type!, id!, userId)

    return apiResponse(200, response)
  } catch (error) {
    console.error(error)
    return apiResponse(500, { message: 'Internal Server Error' })
  }
}

export async function handleListChildren(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const { parentType, parentId, childType } = event.pathParameters || {}
    const queryParams = new URLSearchParams(event.rawQueryString)

    const response = await listChildren(parentType!, parentId!, childType, {
      limit: parseInt(queryParams.get('limit') || '50', /* base */ 10),
      nextCursor: queryParams.get('nextCursor') || undefined
    })

    return apiResponse(200, response)
  } catch (error) {
    console.error(error)
    return apiResponse(500, { message: 'Internal Server Error' })
  }
}

export async function handleListUserItems(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const { type } = event.pathParameters || {}
    const userId = event.requestContext.authorizer?.jwt?.claims.sub || 'not-logged-in'
    const queryParams = new URLSearchParams(event.rawQueryString)

    const response = await listUserItems(userId, type, {
      limit: parseInt(queryParams.get('limit') || '50', /* base */ 10),
      nextCursor: queryParams.get('nextCursor') || undefined
    })

    return apiResponse(200, response)
  } catch (error) {
    console.error(error)
    return apiResponse(500, { message: 'Internal Server Error' })
  }
}
