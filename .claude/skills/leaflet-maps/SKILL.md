# Leaflet Maps Skill

Правила работы с react-leaflet картами в Next.js + Tailwind CSS 4 проекте.

## Проблема

Tailwind CSS 4 применяет `max-width: 100%` к изображениям, что ломает Leaflet tiles — они отображаются в неправильных позициях или частично.

## Обязательные шаги при добавлении карты

### 1. CSS Fixes в globals.css

```css
@import "leaflet/dist/leaflet.css";

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

### 2. Dynamic Import (SSR: false)

Leaflet использует `window` объект и не совместим с SSR:

```tsx
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("./map-component").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-gray-100 flex items-center justify-center">
        Loading map...
      </div>
    ),
  }
);
```

### 3. InvalidateSize компонент

Если карта рендерится с багами (tiles смещены), добавь:

```tsx
import { useMap } from "react-leaflet";
import { useEffect } from "react";

function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    // Fix tiles not loading properly
    setTimeout(() => map.invalidateSize(), 100);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
}

// Использование
<MapContainer>
  <InvalidateSize />
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
</MapContainer>
```

### 4. Inline styles для MapContainer

Предпочитай inline `style` вместо `className` для размеров:

```tsx
<MapContainer
  center={[11.9404, 108.4583]}
  zoom={13}
  style={{ height: "100%", width: "100%" }}
>
```

## Зависимости

```bash
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

## Пример структуры

```
components/
├── items-map.tsx           # Основной компонент карты
├── item-marker.tsx         # Кастомные маркеры
└── location-picker-dialog.tsx  # Диалог выбора локации
```

## Checklist при создании карты

- [ ] Leaflet CSS импортирован в globals.css
- [ ] CSS fixes для Tailwind добавлены
- [ ] Компонент использует dynamic import с ssr: false
- [ ] InvalidateSize добавлен внутрь MapContainer
- [ ] MapContainer использует inline style для размеров

## Типичные ошибки

1. **Tiles в неправильных местах** → Добавь CSS fix `max-width: none !important`
2. **Hydration error** → Используй dynamic import с ssr: false
3. **Карта не занимает контейнер** → Используй inline style вместо className
4. **Tiles не загружаются при resize** → Добавь InvalidateSize компонент
