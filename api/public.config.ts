/**
 * Configuration for public (unauthenticated) access to CRUDL items.
 *
 * This configuration controls access to the public API endpoints:
 * - `GET /api/public/:type/:id` - Read a single public item by type and ID
 * - `GET /api/public/:type` - List public items of a given type
 * - `GET /api/public/:parentType/:parentId/:childType` - List public child items
 *
 * All public endpoints:
 * - Do NOT require authentication
 * - Strip the `user` field from responses for privacy
 * - Return `null` or empty arrays when access is not configured
 *
 * ---
 *
 * `publicItems`: Object with keys for types, values are arrays of allowed ids in that type.
 *   - Controls: `GET /api/public/:type/:id` (read single item)
 *   - When a type+id is in this object, the item can be read publicly
 *   - The `user` field is stripped before returning the item
 *   - If type+id is NOT in this object, the endpoint returns null
 *
 * `publicTypes`: Array of item types that can be listed publicly.
 *   - Controls: `GET /api/public/:type` (list items by type)
 *   - When a type is included here, all items of that type are listable publicly
 *   - Items are returned regardless of their `user` field (owned by any user)
 *   - The `user` field is stripped from all returned items
 *   - If a type is NOT in this array, the endpoint returns an empty array
 *
 * `publicChildTypes`: Array of child item types that can be listed publicly.
 *   - Controls: `GET /api/public/:parentType/:parentId/:childType` (list children)
 *   - When a child type is included here, children of that type are listable publicly
 *   - Works for any parent (parent ownership is not checked)
 *   - The `user` field is stripped from all returned items
 *   - If a child type is NOT in this array, the endpoint returns an empty array
 *
 * ---
 *
 * @example
 * // Allow public read of specific items by ID
 * publicItems = { 'currentEvent': ['main'], 'featured': ['hero', 'sidebar'] }
 * // GET /api/public/currentEvent/main → returns the item (user stripped)
 * // GET /api/public/currentEvent/unknown → returns null
 *
 * @example
 * // Allow public listing of all items of certain types
 * publicTypes = ['event', 'book']
 * // GET /api/public/event → returns all events (user stripped)
 * // GET /api/public/draft → returns [] (not configured)
 *
 * @example
 * // Allow public listing of children by type
 * publicChildTypes = ['tag', 'image', 'comment']
 * // GET /api/public/event/123/tag → returns all tags under event/123
 * // GET /api/public/event/123/secret → returns [] (not configured)
 */
export const publicItems: Record<string, string[]> = { } // e.g. { 'currentEvent': ['main'] }
export const publicTypes: string[] = [] // e.g. ['event', 'book']
export const publicChildTypes: string[] = [] // e.g. ['tag', 'image']
