# Clerk Auth Patterns

Clerk authentication integration with Next.js and Convex.

## Setup

### Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_ISSUER_URL=https://your-clerk-instance.clerk.accounts.dev
```

### Providers Setup

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

## Components

### SignIn / SignUp Buttons

```tsx
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'

<SignedOut>
  <SignInButton mode="modal">
    <Button>Sign In</Button>
  </SignInButton>
  <SignUpButton mode="modal">
    <Button>Sign Up</Button>
  </SignUpButton>
</SignedOut>

<SignedIn>
  <UserButton />
</SignedIn>
```

### User Button (Profile Menu)

```tsx
import { UserButton } from '@clerk/nextjs'

<UserButton
  afterSignOutUrl="/"
  appearance={{
    elements: {
      avatarBox: 'w-10 h-10'
    }
  }}
/>
```

### Protecting Pages

```tsx
// Redirect-based protection
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <div>Protected content</div>
}
```

## Hooks

### useUser

```tsx
'use client'
import { useUser } from '@clerk/nextjs'

export function Profile() {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) return <div>Loading...</div>
  if (!isSignedIn) return <div>Sign in to continue</div>

  return <div>Hello, {user.firstName}</div>
}
```

### useAuth

```tsx
'use client'
import { useAuth } from '@clerk/nextjs'

export function AuthStatus() {
  const { isLoaded, userId, sessionId } = useAuth()

  // Use for auth state checks
}
```

## Convex Integration

### Setup ConvexProviderWithClerk

```tsx
// app/ConvexClientProvider.tsx
'use client'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'
import { ConvexReactClient } from 'convex/react'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function ConvexClientProvider({ children }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
```

### Convex Auth Config

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: 'convex',
    },
  ],
}
```

### Using Auth in Convex Functions

```typescript
// In any Convex function
const identity = await ctx.auth.getUserIdentity()

if (!identity) {
  throw new Error('Unauthenticated')
}

// identity.subject = Clerk user ID (use this!)
// identity.name = User's name
// identity.email = User's email
// identity.pictureUrl = Avatar URL
```

## Patterns

### Check if User Owns Resource

```typescript
// In Convex mutation
const item = await ctx.db.get(itemId)
if (item.ownerId !== identity.subject) {
  throw new Error('Unauthorized')
}
```

### Optional Auth (Guest Access)

```typescript
// Query that works for both guests and logged-in users
export const getPublicItems = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    const items = await ctx.db.query('items').collect()

    if (identity) {
      // Add user-specific data (e.g., "is this my item?")
      return items.map(item => ({
        ...item,
        isOwner: item.ownerId === identity.subject
      }))
    }

    return items
  }
})
```

## Troubleshooting

### "Invalid token" errors

1. Check CLERK_ISSUER_URL matches your Clerk dashboard
2. Ensure Convex auth.config.ts uses the correct domain
3. Redeploy Convex after changing auth.config.ts

### User not authenticated in Convex

1. Ensure ConvexProviderWithClerk wraps your app
2. Check that useAuth is from @clerk/nextjs
3. Verify Clerk keys are correct
