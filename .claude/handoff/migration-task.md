# Migration Task: Add Categories & Location to Sharity

**Режим**: Ralph Wiggum
**Проект**: `/Users/dmitrysurkov/Developer/Personal/sharity-vinhloc`
**Статус**: Приложение работает локально (Convex + Clerk)

---

## Цель

Добавить фичи из dalat-sharity в sharity-vinhloc:
1. **Categories** — 7 типов вещей с иконками и фильтром
2. **Location** — геолокация для items (lat/lng/address)

---

## Task 1: Add Categories to Items

### 1.1 Update Convex Schema

**File**: `convex/schema.ts`

Добавить поле `category`:

```typescript
items: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  ownerId: v.string(),
  imageStorageIds: v.optional(v.array(v.id("_storage"))),
  // ADD:
  category: v.optional(v.union(
    v.literal("kitchen"),
    v.literal("furniture"),
    v.literal("electronics"),
    v.literal("clothing"),
    v.literal("books"),
    v.literal("sports"),
    v.literal("other")
  )),
})
```

### 1.2 Update Item Form

**File**: `components/item-form.tsx`

Добавить select для выбора категории:
- Import категории
- Добавить state для category
- Добавить Select компонент в форму
- Передать category в mutation

### 1.3 Update Item Card

**File**: `components/item-card.tsx`

Показать категорию на карточке:
- Badge с названием категории
- Опционально: иконка категории

### 1.4 Add Category Filter (optional)

**File**: `components/item-list.tsx` или новый `components/category-filter.tsx`

Добавить фильтр по категориям в список items.

---

## Task 2: Add Location to Items

### 2.1 Update Convex Schema

**File**: `convex/schema.ts`

Добавить поле `location`:

```typescript
items: defineTable({
  // ... existing fields
  location: v.optional(v.object({
    lat: v.number(),
    lng: v.number(),
    address: v.optional(v.string())
  })),
})
```

### 2.2 Update Item Form

**File**: `components/item-form.tsx`

Добавить поля для локации:
- Input для address (текстовое поле)
- "Use my location" кнопка (navigator.geolocation)
- Hidden inputs для lat/lng

### 2.3 Update Item Card

**File**: `components/item-card.tsx`

Показать локацию:
- Текст адреса если есть
- Опционально: ссылка на Google Maps

---

## Reference: dalat-sharity Types

**Source**: `/Users/dmitrysurkov/Developer/Personal/dalat-sharity/src/types/index.ts`

```typescript
export type ItemCategory =
  | 'kitchen'
  | 'furniture'
  | 'electronics'
  | 'clothing'
  | 'books'
  | 'sports'
  | 'other'

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  kitchen: 'Kitchen',
  furniture: 'Furniture',
  electronics: 'Electronics',
  clothing: 'Clothing',
  books: 'Books',
  sports: 'Sports',
  other: 'Other',
}

export interface Location {
  lat: number
  lng: number
  address: string
}
```

---

## Порядок выполнения

1. **Schema first** — обновить `convex/schema.ts` (Convex auto-migrate)
2. **Mutations** — обновить `convex/items.ts` для новых полей
3. **Form** — обновить `components/item-form.tsx`
4. **Display** — обновить `components/item-card.tsx`
5. **Filter** — добавить category filter (optional)
6. **Test** — проверить создание и отображение items

---

## Критерии успеха

- [ ] Можно создать item с категорией
- [ ] Категория отображается на карточке
- [ ] Можно создать item с локацией (address + coordinates)
- [ ] Локация отображается на карточке
- [ ] Существующие items без категории/локации работают (optional fields)

---

## Запуск

```bash
cd /Users/dmitrysurkov/Developer/Personal/sharity-vinhloc

# Convex dev (если не запущен)
npx convex dev

# Next.js dev (в другом терминале)
pnpm dev

# Открыть http://localhost:3000
```

---

## Notes

- Convex автоматически мигрирует schema при изменениях
- Все новые поля должны быть `v.optional()` для обратной совместимости
- Clerk auth уже работает (trusted-shiner-99)
- `convex/auth.config.ts` захардкожен для локальной разработки
