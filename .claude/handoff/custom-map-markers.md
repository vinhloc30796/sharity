# Task: Custom Map Markers by Category

**Mode**: Ralph Wiggum
**Project**: `/Users/dmitrysurkov/Developer/Personal/sharity-vinhloc`
**Status**: Нужно заменить стандартные синие маркеры на кастомные с иконками категорий

---

## Context Summary

Карта работает, но маркеры — стандартные синие Leaflet pins. Нужно сделать кастомные маркеры как в референс-проекте `/Users/dmitrysurkov/Developer/Personal/dalat-sharity/`.

---

## Already Done

- [x] Map View с Leaflet — `components/items-map.tsx`
- [x] Category Filter — `components/category-filter.tsx`
- [x] 10 тестовых items с картинками и локациями
- [x] Все категории: kitchen, furniture, electronics, clothing, books, sports, other

---

## TODO: Custom Markers

### Референс реализация (dalat-sharity)

**Файл**: `src/components/map/item-marker.tsx`

```typescript
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import {
  UtensilsCrossed,  // kitchen
  Sofa,             // furniture
  Smartphone,       // electronics
  Shirt,            // clothing
  BookOpen,         // books
  Dumbbell,         // sports
  Package,          // other
} from 'lucide-react'
import { renderToString } from 'react-dom/server'

const CATEGORY_ICON_MAP: Record<ItemCategory, LucideIcon> = {
  kitchen: UtensilsCrossed,
  furniture: Sofa,
  electronics: Smartphone,
  clothing: Shirt,
  books: BookOpen,
  sports: Dumbbell,
  other: Package,
}

// Создание кастомной иконки
const iconHtml = renderToString(
  <div className="flex items-center justify-center rounded-full border-2 bg-white shadow-lg w-10 h-10 border-gray-300 hover:scale-110 cursor-pointer">
    <IconComponent className="w-5 h-5 text-gray-700" />
  </div>
)

const customIcon = L.divIcon({
  html: iconHtml,
  className: 'custom-marker-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})
```

---

### Шаги реализации

1. **Создать `components/item-marker.tsx`**
   - Импортировать Lucide иконки для каждой категории
   - Использовать `L.divIcon()` + `renderToString()`
   - Стилизовать через Tailwind (круглый, белый фон, тень)

2. **Обновить `components/items-map.tsx`**
   - Заменить стандартный `<Marker>` на `<ItemMarker>`
   - Передавать item с категорией

3. **Добавить CSS для маркеров** (если нужно)
   ```css
   .custom-marker-icon {
     background: transparent !important;
     border: none !important;
   }
   ```

---

## Key Files

| File | Purpose |
|------|---------|
| `components/items-map.tsx` | Текущая карта (нужно обновить) |
| `components/item-form.tsx:28-45` | Типы категорий и labels |
| Референс: `dalat-sharity/src/components/map/item-marker.tsx` | Готовая реализация |

---

## Dependencies

Уже установлены:
- `leaflet`, `react-leaflet`
- `lucide-react` (иконки)

Может понадобиться:
- `react-dom/server` для `renderToString()` (встроен в React)

---

## Services

- Convex: http://127.0.0.1:3210
- Next.js: http://localhost:3000

---

## Execution Rules

- Browser testing → delegate to `general-purpose` subagent
- Main agent focuses on: code edits

---

## Success Criteria

- [ ] Маркеры отображают иконку категории (не синий pin)
- [ ] Круглые белые маркеры с тенью
- [ ] Разные иконки для разных категорий
- [ ] Hover эффект (scale)
- [ ] Popup всё ещё работает при клике

---

## Startup Prompt

```
Прочитай .claude/handoff/custom-map-markers.md и реализуй кастомные маркеры:

1. Создай components/item-marker.tsx по референсу из dalat-sharity
2. Обнови components/items-map.tsx — используй новый ItemMarker
3. Протестируй в браузере (делегируй subagent)

Сервисы уже запущены.
```
