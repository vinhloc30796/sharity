# Task: Setup Claude Code Context for Sharity

**Проект**: `/Users/dmitrysurkov/Developer/Personal/sharity-vinhloc`
**Reference**: `/Users/dmitrysurkov/Developer/Personal/dalat-sharity/`

---

## Цель

Создать полноценный Claude Code контекст для sharity-vinhloc по аналогии с dalat-sharity:
1. `CLAUDE.md` — главный файл с описанием проекта
2. `.claude/` структура — handoff, commands, settings

---

## Task 1: Create CLAUDE.md

Создать `/Users/dmitrysurkov/Developer/Personal/sharity-vinhloc/CLAUDE.md` с содержимым:

### Обязательные секции:

1. **Project Description**
   - Sharity — платформа для sharing/borrowing вещей в Da Lat
   - Borrow and lend useful items

2. **Tech Stack**
   - Next.js 16+ (App Router)
   - Tailwind CSS + shadcn/ui
   - Convex (database + realtime)
   - Clerk (authentication)
   - pnpm
   - Biome (linter)

3. **Project Structure**
   ```
   sharity-vinhloc/
   ├── app/                    # Next.js App Router
   │   ├── page.tsx            # Main page
   │   ├── layout.tsx          # Root layout
   │   ├── globals.css         # Global styles
   │   └── ConvexClientProvider.tsx
   ├── components/             # React components
   │   ├── ui/                 # shadcn components
   │   ├── item-*.tsx          # Item components
   │   └── claim-*.tsx         # Claim components
   ├── convex/                 # Convex backend
   │   ├── schema.ts           # Database schema
   │   ├── items.ts            # Items queries/mutations
   │   └── auth.config.ts      # Clerk auth config
   ├── hooks/                  # React hooks
   ├── lib/                    # Utilities
   └── public/                 # Static files
   ```

4. **Data Models** (from convex/schema.ts)
   - Items: name, description, ownerId, imageStorageIds, category?, location?
   - Claims: itemId, claimerId, status, startDate, endDate

5. **Commands**
   ```bash
   pnpm dev           # Start dev server
   pnpm build         # Build for production
   pnpm lint          # Run ESLint
   pnpm format        # Format with Biome
   npx convex dev     # Run Convex dev server
   ```

6. **Environment Variables**
   ```
   CONVEX_DEPLOYMENT
   NEXT_PUBLIC_CONVEX_URL
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   CLERK_ISSUER_URL
   ```

7. **Key Files Reference**
   | What | Where |
   |------|-------|
   | Database schema | `convex/schema.ts` |
   | Items API | `convex/items.ts` |
   | Auth config | `convex/auth.config.ts` |
   | Main page | `app/page.tsx` |
   | Item form | `components/item-form.tsx` |
   | Item card | `components/item-card.tsx` |

8. **Deployment**
   - Production: https://sharity-dalat.vercel.app
   - Auto-deploy from `main` branch

---

## Task 2: Setup .claude/ Structure

### 2.1 Create directories

```bash
mkdir -p .claude/{handoff,commands,settings}
```

### 2.2 Create .claude/README.md

Описание структуры .claude/ папки.

### 2.3 Create .claude/settings.json (optional)

```json
{
  "project": "sharity-vinhloc",
  "language": "en",
  "conventions": {
    "components": "PascalCase",
    "files": "kebab-case",
    "convex_functions": "camelCase"
  }
}
```

---

## Reference: dalat-sharity CLAUDE.md

Используй как образец:
- `/Users/dmitrysurkov/Developer/Personal/dalat-sharity/CLAUDE.md`

Адаптируй для:
- Convex вместо Supabase
- Clerk вместо Supabase Auth
- pnpm вместо npm
- Упрощённая структура (нет src/, всё в корне)

---

## Критерии успеха

- [ ] `CLAUDE.md` создан в корне проекта
- [ ] Описан актуальный tech stack (Convex + Clerk)
- [ ] Описана структура проекта
- [ ] Указаны команды для разработки
- [ ] `.claude/` папка структурирована
