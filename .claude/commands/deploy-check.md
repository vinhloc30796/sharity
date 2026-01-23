# /deploy-check

Pre-deployment validation checklist for Convex + Vercel.

## Steps

### 1. Code Quality Checks

```bash
# Lint check
pnpm lint

# Type check (includes Next.js build)
pnpm build

# Convex type generation
npx convex dev --once
```

### 2. Environment Check

- [ ] All required env vars documented in .env.example
- [ ] No secrets in code
- [ ] NEXT_PUBLIC_CONVEX_URL is production URL
- [ ] Clerk keys are production keys

### 3. Convex Backend Check

```bash
# Deploy Convex functions (if not auto-deploying)
npx convex deploy
```

- [ ] Schema is deployed
- [ ] Functions are deployed
- [ ] Indexes are created
- [ ] Auth config is correct

### 4. Performance Check

- [ ] Bundle size is reasonable (< 200KB JS)
- [ ] Images use Convex storage with proper URLs
- [ ] No console.log statements in production code
- [ ] Convex queries use indexes for filtered fields

### 5. Security Check

- [ ] All mutations check authentication
- [ ] Authorization checks for owned resources
- [ ] Clerk middleware configured (if using)
- [ ] No sensitive data in client-side code

### 6. Build Verification

```bash
# Full production build
pnpm build

# Check for build warnings
# Verify no unused exports
```

## Report Format

```markdown
# Deploy Readiness Report

## Checks Passed
- ✅ Lint: No errors
- ✅ Types: Build successful
- ✅ Convex: Functions deployed
- ✅ Security: Auth checks in place

## Warnings
- ⚠️ [Warning description]

## Blockers
- ❌ [Blocker description]

## Recommendation
[READY TO DEPLOY / NEEDS FIXES]
```

## Deployment Commands

```bash
# 1. Deploy Convex backend
npx convex deploy

# 2. Deploy to Vercel (auto via git push or manual)
vercel --prod
```

## Notes

- Run before every production deployment
- All blockers must be resolved
- Convex deploys separately from Vercel
