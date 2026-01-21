# /create-feature

Workflow for implementing new features with Convex backend.

## Usage

```
/create-feature [feature name]
```

## Workflow

### Phase 1: Research (Explore Agent)

```
Task(subagent_type="Explore", prompt="
Research codebase for implementing [feature]:
1. Find similar existing features
2. Identify files that need changes
3. Check for reusable components
4. Understand current Convex patterns
")
```

### Phase 2: Plan (TodoWrite)

Create implementation plan:
1. Define acceptance criteria
2. List files to create/modify
3. Identify Convex schema changes (if any)
4. Estimate complexity

### Phase 3: Backend First (Convex)

1. **Schema** (if needed)
```typescript
// convex/schema.ts
newTable: defineTable({
  field: v.string(),
  // ...
}).index('by_field', ['field'])
```

2. **Query**
```typescript
// convex/[feature].ts
export const get = query({
  args: {},
  handler: async (ctx) => {
    // Implementation
  },
})
```

3. **Mutation**
```typescript
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    // Implementation
  },
})
```

### Phase 4: Frontend Implementation

1. **Hook into Convex**
```typescript
'use client'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

const data = useQuery(api.feature.get)
const createAction = useMutation(api.feature.create)
```

2. **Build UI Components**
- Use existing shadcn components
- Follow existing patterns in `components/`

3. **Add to Page**
- Create page in `app/` if needed
- Or add to existing page

### Phase 5: Verification

```bash
# Run Convex dev to check types
npx convex dev --once

# Build check
pnpm build

# Manual testing
pnpm dev
```

## Checklist

- [ ] Acceptance criteria defined
- [ ] Convex schema updated (if needed)
- [ ] Convex functions implemented
- [ ] Auth checks in mutations
- [ ] Frontend components created
- [ ] Loading states handled
- [ ] Error states handled
- [ ] No TypeScript errors

## Example: Add Comments Feature

```markdown
Feature: Comments on Items
Users can comment on items

Acceptance Criteria:
1. User can add comment to item
2. Comments show author and timestamp
3. Only comment author can delete
4. Real-time updates

Convex Schema:
- convex/schema.ts: add comments table

Convex Functions:
- convex/comments.ts: get, create, delete

Frontend:
- components/comment-list.tsx
- components/comment-form.tsx
- Add to item detail page
```

## Notes

- Convex functions are the source of truth
- Frontend is just a view layer
- Real-time updates come free with Convex
- Always check auth in mutations
