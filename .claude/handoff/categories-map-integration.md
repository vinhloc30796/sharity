# Handoff: Категории, Карта и Локации

## Статус: ✅ Готово к коммиту

## Что сделано

### Новые фичи (наши изменения)
1. **Категории вещей** — dropdown в форме, фильтр на главной (Kitchen, Furniture, Electronics, Clothing, Books, Sports, Other)
2. **Карта Da Lat** — отображение вещей с локациями на карте (react-leaflet)
3. **Location picker** — выбор локации на карте при создании вещи
4. **Локации на карточках** — ссылка на Google Maps

### Интегрированные фичи Vinh Loc'а
- **Notifications** — колокольчик с уведомлениями о заявках (коммит 527c07e)

## Новые файлы
```
components/
├── category-filter.tsx        # Фильтр категорий (toggle buttons)
├── items-map.tsx              # Карта с маркерами вещей
├── item-marker.tsx            # Кастомные маркеры для категорий
├── location-picker-dialog.tsx # Диалог выбора локации
├── ui/badge.tsx               # shadcn badge
└── ui/select.tsx              # shadcn select
```

## Изменённые файлы
- `convex/schema.ts` — добавлены поля `category` и `location` в items
- `convex/items.ts` — обновлены create/update/get для новых полей
- `components/item-form.tsx` — добавлены Category select и Location picker
- `components/item-list.tsx` — добавлены CategoryFilter, ItemsMap, view toggle
- `components/item-card.tsx` — отображение категории и локации
- `app/globals.css` — Leaflet CSS fixes для Tailwind 4

## Важные исправления

### Leaflet + Tailwind CSS 4
Tailwind 4 ломает Leaflet tiles. Обязательные CSS fixes в `globals.css`:
```css
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
  max-width: none !important;
  max-height: none !important;
}
```

### Dynamic Import
Карта использует dynamic import с `ssr: false` для избежания hydration errors.

## Git Status
- Branch: `main`
- 16 modified + 9 untracked файлов
- ~700 строк добавлено
- Конфликтов нет
- Build проходит

## Что НЕ закоммичено
Все изменения в working directory, commit не создан.

## Зависимости добавлены
```json
"leaflet": "^1.9.4",
"react-leaflet": "^5.0.0",
"@types/leaflet": "^1.9.17"
```

## Тестирование
- ✅ Категории работают
- ✅ Фильтрация по категориям работает
- ✅ Карта отображается корректно
- ✅ Маркеры на карте
- ✅ Location picker в форме
- ✅ Notifications Vinh Loc'а работают
- ✅ Build проходит

## Документация
- Обновлён `CLAUDE.md` — раздел Leaflet Maps
- Создан skill `.claude/skills/leaflet-maps/SKILL.md`

## Для продолжения
```bash
# Проверить приложение
pnpm dev
npx convex dev

# Открыть http://localhost:3000
```

---
*Создано: 2026-01-21*
