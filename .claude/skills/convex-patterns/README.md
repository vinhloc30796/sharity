# Convex Patterns

Common patterns for working with Convex in the Sharity project.

## Real-time Data

Convex queries automatically update in real-time. No additional setup needed.

```tsx
'use client'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

function ItemList() {
  const items = useQuery(api.items.get)

  // `items` automatically updates when data changes!
  // Returns `undefined` while loading

  if (items === undefined) return <Loading />
  return <List items={items} />
}
```

## Conditional Queries

Skip query when conditions aren't met:

```tsx
const claims = useQuery(
  api.items.getClaims,
  itemId ? { itemId } : 'skip'  // Skip if no itemId
)
```

## Optimistic Updates

Convex handles optimistic updates automatically for most cases. For custom behavior:

```tsx
const createItem = useMutation(api.items.create)

async function handleCreate(name: string) {
  // Mutation returns immediately with optimistic update
  await createItem({ name })
  // UI already updated!
}
```

## File Upload Pattern

```tsx
const generateUploadUrl = useMutation(api.items.generateUploadUrl)
const createItem = useMutation(api.items.create)

async function handleUpload(file: File, name: string) {
  // 1. Get upload URL
  const uploadUrl = await generateUploadUrl()

  // 2. Upload file
  const result = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  const { storageId } = await result.json()

  // 3. Create item with storage ID
  await createItem({
    name,
    imageStorageIds: [storageId],
  })
}
```

## Error Handling

### In Frontend

```tsx
const createItem = useMutation(api.items.create)

async function handleCreate(data: FormData) {
  try {
    await createItem({ name: data.get('name') as string })
    toast.success('Item created!')
  } catch (error) {
    // Convex errors have message property
    toast.error(error.message)
  }
}
```

### In Convex Functions

```typescript
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    if (args.name.length < 3) {
      throw new Error('Name must be at least 3 characters')
    }
    // ... rest of logic
  },
})
```

## Pagination Pattern

```typescript
// convex/items.ts
export const list = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10

    let query = ctx.db.query('items').order('desc')

    if (args.cursor) {
      // Use cursor for pagination
    }

    const items = await query.take(limit + 1)
    const hasMore = items.length > limit

    return {
      items: items.slice(0, limit),
      nextCursor: hasMore ? items[limit - 1]._id : null,
    }
  },
})
```

## Index Usage

Always use indexes for filtered queries:

```typescript
// Schema
claims: defineTable({
  itemId: v.id('items'),
  status: v.string(),
})
  .index('by_item', ['itemId'])
  .index('by_status', ['status'])

// Query - GOOD (uses index)
await ctx.db
  .query('claims')
  .withIndex('by_item', q => q.eq('itemId', itemId))
  .collect()

// Query - BAD (full table scan)
await ctx.db
  .query('claims')
  .filter(q => q.eq(q.field('itemId'), itemId))
  .collect()
```

## Batch Operations

Avoid N+1 by using Promise.all:

```typescript
// GOOD
const items = await ctx.db.query('items').collect()
const itemsWithUrls = await Promise.all(
  items.map(async (item) => {
    const url = item.imageId
      ? await ctx.storage.getUrl(item.imageId)
      : null
    return { ...item, imageUrl: url }
  })
)

// BAD (sequential, slow)
const items = await ctx.db.query('items').collect()
for (const item of items) {
  item.imageUrl = await ctx.storage.getUrl(item.imageId)
}
```

## Relationships

Manual joins in Convex:

```typescript
export const getItemWithOwner = query({
  args: { itemId: v.id('items') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) return null

    // "Join" - fetch related data
    const claims = await ctx.db
      .query('claims')
      .withIndex('by_item', q => q.eq('itemId', item._id))
      .collect()

    return {
      ...item,
      claims,
      claimCount: claims.length,
    }
  },
})
```

## Development Commands

```bash
# Start dev server (watches for changes)
npx convex dev

# One-time type generation
npx convex dev --once

# Deploy to production
npx convex deploy

# View dashboard
npx convex dashboard
```
