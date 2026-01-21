# Browser Delegation Rule

## Golden Rule

**ВСЕГДА делегируй browser automation задачи в subagents.**

Browser automation (screenshots, navigation, clicks, form fills) генерирует огромное количество контекста. Если делать это в основном агенте — контекст быстро забивается.

## Паттерн

```
# ПЛОХО — забивает контекст основного агента
mcp__claude-in-chrome__computer(screenshot)
mcp__claude-in-chrome__navigate(...)
mcp__claude-in-chrome__read_page(...)

# ХОРОШО — делегация в subagent
Task(
  subagent_type="general-purpose",
  run_in_background=true,
  prompt="You have browser tools. Do X, Y, Z..."
)
```

## Когда делегировать

- Любая навигация по сайтам
- Заполнение форм
- Тестирование UI
- Скриншоты и анализ страниц
- Multi-step browser workflows

## Когда НЕ делегировать

- Единичный быстрый скриншот для показа пользователю
- Простая проверка "страница открылась?"

## Преимущества делегации

1. **Сохранение контекста** — основной агент остаётся "чистым"
2. **Параллельность** — можно запустить несколько browser задач одновременно
3. **Изоляция ошибок** — если browser task падает, основной агент продолжает работать

## Пример из практики

```
# Запуск двух browser задач параллельно
Task(description="Setup Google OAuth in GCP", run_in_background=true, ...)
Task(description="Test auth on production", run_in_background=true, ...)

# Основной агент свободен для других задач
# Проверка результатов через Read output_file или ожидание notification
```
