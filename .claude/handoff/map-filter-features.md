# Task: Map View & Category Filter for Sharity

**Mode**: Ralph Wiggum (autonomous execution)
**Project**: `/Users/dmitrysurkov/Developer/Personal/sharity-vinhloc`
**Status**: Categories и Location уже в schema — нужны UI фичи

---

## Context Summary

Sharity — платформа для шеринга вещей в Да Лат. Добавлены поля `category` и `location` в items. Теперь нужны:
1. Фильтр по категориям
2. Карта с маркерами items

---

## Already Done

- [x] Schema: `category` (7 типов) и `location` (lat/lng/address) — `convex/schema.ts`
- [x] Mutations: create/update поддерживают новые поля — `convex/items.ts`
- [x] Form: Category Select + Location с геолокацией — `components/item-form.tsx`
- [x] Card: Badge категории + ссылка на Google Maps — `components/item-card.tsx`

---

## TODO (Next Session)

### Task 1: Category Filter

**Files**:
- `components/category-filter.tsx` (создать)
- `app/page.tsx` (интегрировать)

```typescript
// Использовать типы из item-form.tsx
import { ItemCategory, CATEGORY_LABELS } from "@/components/item-form";

// Компонент: кнопки/chips для каждой категории
// Props: selectedCategories, onSelectionChange
// "All" кнопка для сброса
```

**Шаги**:
1. Создать `components/category-filter.tsx`
2. Добавить state в `app/page.tsx` для выбранных категорий
3. Фильтровать items перед рендером
4. Разместить фильтр над списком items

---

### Task 2: Map View с Leaflet

**Files**:
- `components/items-map.tsx` (создать)
- `app/page.tsx` (добавить переключатель)
- `app/globals.css` (импорт стилей Leaflet)

**Установка**:
```bash
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

**Компонент карты**:
```typescript
// Центр: Da Lat (11.9404, 108.4583)
// Маркеры: items с location
// Popup: название, категория, описание
// Клик на popup → переход к item
```

**Переключатель**:
```typescript
// Tabs или Toggle: "List" | "Map"
// Map показывает только items с location
// Использовать shadcn Tabs компонент
```

**CSS**:
```css
/* app/globals.css */
@import 'leaflet/dist/leaflet.css';
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `convex/schema.ts:5-21` | Items schema с category/location |
| `convex/items.ts:147-189` | Create mutation |
| `components/item-form.tsx:20-40` | Category types и labels |
| `components/item-card.tsx` | Card с badge и location |
| `app/page.tsx` | Main page с items list |

---

## Services

- Convex: http://127.0.0.1:3210
- Next.js: http://localhost:3000
- Dashboard: http://127.0.0.1:6790

---

## Execution Rules

**Browser Testing → DELEGATE to subagent!**

```
# Экономь контекст главного агента
Task(
  description="Test map feature in browser",
  subagent_type="general-purpose",
  prompt="Open localhost:3000, test map/filter, report results"
)
```

- Edits, coordination → главный агент
- Browser automation → subagent `general-purpose`
- Code exploration → subagent `Explore`

---

## Success Criteria

- [ ] Фильтр категорий отображается над списком
- [ ] Клик на категорию фильтрует items
- [ ] "All" сбрасывает фильтр
- [ ] Карта показывает маркеры items с location
- [ ] Клик на маркер открывает popup с info
- [ ] Переключатель List/Map работает
- [ ] Leaflet стили загружаются корректно

---

## Startup Prompt

```
Прочитай .claude/handoff/map-filter-features.md и выполни:

1. Создай CategoryFilter компонент
2. Интегрируй фильтр в page.tsx
3. Установи Leaflet (pnpm add leaflet react-leaflet @types/leaflet -D)
4. Создай ItemsMap компонент
5. Добавь переключатель List/Map
6. Протестируй в браузере

Сервисы уже запущены:
- Convex: http://127.0.0.1:3210
- Next.js: http://localhost:3000
```
