# Sharity (Vinh Loc Edition)

Платформа для sharing economy — люди одалживают и находят вещи для временного использования.

## Концепция

**Проблема:** У людей есть вещи, которые редко используются, но могут быть полезны другим.

**Решение:** Платформа для временного шеринга вещей с системой заявок и календарём доступности.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, React 19)
- **Backend:** Convex (serverless database + functions)
- **Auth:** Clerk (OAuth, passwordless)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Package Manager:** pnpm
- **Language:** TypeScript 5

## Структура проекта

```
sharity-vinhloc/
├── app/                     # Next.js App Router
│   ├── page.tsx             # Главная (список вещей)
│   ├── layout.tsx           # Root layout (Clerk + Convex providers)
│   ├── globals.css          # Tailwind styles
│   └── ConvexClientProvider.tsx
├── components/              # React компоненты
│   ├── ui/                  # shadcn компоненты
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── file-upload.tsx
│   │   └── ...
│   ├── item-card.tsx        # Карточка вещи
│   ├── item-form.tsx        # Форма добавления/редактирования
│   ├── item-list.tsx        # Список вещей
│   ├── my-item-card.tsx     # Карточка своей вещи (с claims)
│   ├── my-items-list.tsx    # Список своих вещей
│   ├── claim-button.tsx     # Кнопка заявки
│   └── claim-item-back.tsx  # Возврат вещи
├── convex/                  # Convex backend
│   ├── schema.ts            # Database schema
│   ├── items.ts             # Queries & mutations
│   ├── auth.config.ts       # Clerk integration
│   └── _generated/          # Auto-generated types
├── hooks/                   # Custom hooks
│   ├── use-as-ref.ts
│   ├── use-isomorphic-layout-effect.ts
│   └── use-lazy-ref.ts
├── lib/                     # Утилиты
│   └── utils.ts             # cn() helper
├── public/                  # Статика
└── .claude/                 # Claude Code конфиг
    └── handoff/             # Handoff файлы
```

## Модель данных (Convex Schema)

### Item (Вещь)
```typescript
items: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  ownerId: v.string(),  // Clerk user ID
  imageStorageIds: v.optional(v.array(v.id("_storage"))),
})
```

### Claim (Заявка)
```typescript
claims: defineTable({
  itemId: v.id("items"),
  claimerId: v.string(),  // Clerk user ID
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
  ),
  startDate: v.number(),  // timestamp
  endDate: v.number(),    // timestamp
})
  .index("by_item", ["itemId"])
  .index("by_claimer", ["claimerId"])
```

## Convex Functions (convex/items.ts)

### Queries
- `get` — Получить все доступные вещи (исключая свои)
- `getMyItems` — Получить свои вещи + взятые на время
- `getClaims` — Получить заявки на вещь (только владелец)
- `getAvailability` — Получить занятые периоды для календаря

### Mutations
- `create` — Создать вещь
- `update` — Обновить вещь (только владелец)
- `deleteItem` — Удалить вещь (только владелец)
- `requestItem` — Создать заявку на вещь
- `approveClaim` — Одобрить заявку (только владелец)
- `rejectClaim` — Отклонить заявку (только владелец)
- `cancelClaim` — Отменить свою заявку
- `generateUploadUrl` — URL для загрузки изображений

## Команды

```bash
# Разработка
pnpm dev              # Запуск Next.js dev сервера
pnpm convex:dev       # Запуск Convex dev (в отдельном терминале)
# или: pnpm convex dev

# Сборка
pnpm build            # Production build
pnpm start            # Start production server

# Качество кода
pnpm lint             # ESLint
pnpm format           # Biome formatter
```

## Environment Variables

```env
# Convex
CONVEX_DEPLOYMENT=            # team:project identifier
CONVEX_DEPLOYMENT_KEY=        # для production
NEXT_PUBLIC_CONVEX_URL=       # https://xxx.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_ISSUER_URL=             # для Convex auth
```

## Authentication Flow

1. **Clerk** handles authentication (SignIn/SignUp modal)
2. **Convex** validates JWT tokens via `auth.config.ts`
3. User ID доступен через `ctx.auth.getUserIdentity().subject`

```typescript
// В Convex function
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthenticated");
const userId = identity.subject;
```

## Key Patterns

### Convex + Clerk Setup
```tsx
// app/layout.tsx
<ClerkProvider>
  <ConvexClientProvider>
    {children}
  </ConvexClientProvider>
</ClerkProvider>
```

### Convex Client Provider
```tsx
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
```

### Using Convex in Components
```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const items = useQuery(api.items.get);
const createItem = useMutation(api.items.create);
```

## MVP Features

- [x] Список вещей с изображениями
- [x] Добавление/редактирование вещей
- [x] Загрузка изображений (Convex Storage)
- [x] Система заявок (request/approve/reject)
- [x] Календарь доступности
- [x] Мои вещи / Взятые вещи

## Claims Flow

1. User requests item с выбором дат
2. Owner видит pending claims в карточке
3. Owner approves/rejects claim
4. При approve — даты блокируются в календаре
5. Claimer видит вещь в "My Items" как borrowed

## Business Rules

- Максимум 5 pending claims на одну вещь
- Нельзя запросить свою вещь
- Даты approved claims не могут пересекаться
- Только owner может approve/reject claims
- Только claimer может отменить свою заявку

## Leaflet Maps (react-leaflet)

### ВАЖНО: Tailwind CSS 4 ломает Leaflet tiles!

При использовании Leaflet с Tailwind CSS 4 обязательно добавь в `globals.css`:

```css
/* Fix Leaflet tiles broken by Tailwind CSS reset */
.leaflet-container {
  width: 100%;
  height: 100%;
}

.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
  max-width: none !important;
  max-height: none !important;
}

.leaflet-tile-pane img {
  max-width: none !important;
  max-height: none !important;
}

.leaflet-pane {
  z-index: 400;
}

.leaflet-control {
  z-index: 800;
}
```

### Dynamic Import (обязательно!)

Leaflet не работает с SSR. Всегда используй dynamic import:

```tsx
// В компоненте который использует карту
import dynamic from "next/dynamic";

const ItemsMap = dynamic(
  () => import("./items-map").then((mod) => mod.ItemsMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] bg-gray-100">Loading map...</div>,
  }
);
```

### InvalidateSize

Если карта рендерится неправильно (tiles не на своих местах), добавь компонент:

```tsx
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

// Внутри MapContainer
<MapContainer>
  <InvalidateSize />
  <TileLayer ... />
</MapContainer>
```

### Leaflet CSS Import

В `globals.css` импортируй Leaflet CSS:
```css
@import "leaflet/dist/leaflet.css";
```

### Структура компонента карты

См. `components/items-map.tsx` — пример с dynamic import внутри компонента для SSR-совместимости.

---

*Последнее обновление: 2026-01-21*
