# Задача: Location Picker Dialog с картой (Airbnb-style)

## Контекст
В форме "Add an Item" нужно улучшить выбор локации:
- Сейчас есть только кнопка геолокации и текстовое поле адреса
- Нужен полноценный map picker как в Airbnb

## Что нужно реализовать

### 1. Создать `components/location-picker-map.tsx`
Интерактивная карта для выбора локации:
- Клик на карту → ставит маркер
- Маркер можно перетаскивать
- Reverse geocoding через Nominatim API для получения адреса
- Dynamic imports для SSR совместимости

Референс паттерна из dalat-sharity:
```typescript
// Используй useMapEvents для обработки кликов
useMapEvents({
  click: (e) => {
    onLocationSelect(e.latlng.lat, e.latlng.lng)
  }
})

// Reverse geocoding через бесплатный Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  )
  const data = await response.json()
  // Упрощаем адрес до района/области (не точный адрес для приватности)
  const parts = data.display_name?.split(',').slice(0, 3).join(',')
  return parts || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}
```

### 2. Создать `components/location-picker-dialog.tsx`
Диалог с картой:
- Используй shadcn Dialog из `components/ui/dialog.tsx`
- Внутри LocationPickerMap
- Кнопка "Use current location" (геолокация браузера)
- Кнопки Confirm/Cancel
- Показывает выбранный адрес

Props:
```typescript
interface LocationPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: { lat: number; lng: number; address?: string }
  onSelect: (location: { lat: number; lng: number; address: string }) => void
}
```

### 3. Обновить `components/item-form.tsx`
Заменить текущую секцию Location (строки 267-296):
- Показывать выбранный адрес в input (readonly или editable)
- Кнопка "Pick on map" открывает LocationPickerDialog
- Кнопка текущей локации тоже использует reverse geocoding

Текущий код location секции:
```tsx
<div className="flex flex-col gap-2">
  <Label>Location</Label>
  <div className="flex gap-2">
    <Input
      type="text"
      placeholder="Address (optional)"
      value={address}
      onChange={(e) => setAddress(e.target.value)}
      ...
    />
    <Button type="button" variant="outline" onClick={handleGetLocation}>
      <MapPin className="h-4 w-4" />
    </Button>
  </div>
  {location && (
    <p className="text-xs text-muted-foreground">
      📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
    </p>
  )}
</div>
```

Нужно заменить на:
- Input с адресом (заполняется автоматически)
- Две кнопки: "Pick on map" (открывает диалог) и "Current location" (геолокация)
- LocationPickerDialog интеграция

## Технические детали

### Da Lat координаты (центр карты по умолчанию)
```typescript
const DEFAULT_CENTER: [number, number] = [11.9404, 108.4583]
```

### Приватность (Airbnb-style)
- Округляй координаты до ~100м точности для отображения
- Показывай район/область, а не точный адрес
- В базе храни точные координаты, но на карте показывай примерную область

### SSR совместимость
Все Leaflet компоненты импортируй динамически:
```typescript
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
```

## Существующие компоненты для переиспользования
- `components/ui/dialog.tsx` - shadcn Dialog
- `components/items-map.tsx` - паттерн динамического импорта Leaflet
- `components/item-marker.tsx` - создание кастомных иконок маркеров

## Зависимости (уже установлены)
- react-leaflet@5.0.0
- leaflet@1.9.4
- lucide-react (MapPin icon)

## Проверка
1. Открыть http://localhost:3000
2. В форме "Add an Item" нажать "Pick on map"
3. Кликнуть на карте → маркер появляется, адрес автозаполняется
4. Нажать "Current location" → геолокация + reverse geocode
5. Подтвердить → локация сохраняется в форме
6. Создать item → локация видна на карте items
