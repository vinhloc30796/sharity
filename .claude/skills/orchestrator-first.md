# Orchestrator-First Principle

## Core Philosophy

**Claude Code = Аркестратор (Architect + Orchestrator)**

Главный агент НЕ должен выполнять "грязную работу" напрямую. Его роль:
1. **Понять** задачу пользователя
2. **Спланировать** декомпозицию
3. **Делегировать** в subagents
4. **Координировать** параллельное выполнение
5. **Синтезировать** результаты
6. **Коммуницировать** с пользователем

## Что делегировать (ВСЕГДА)

| Тип работы | Subagent | Причина |
|------------|----------|---------|
| Browser automation | `general-purpose` | Screenshots, DOM = огромный контекст |
| Code exploration | `Explore` | Поиск по кодовой базе генерит много данных |
| Long research | `general-purpose` | Web search, file reads накапливаются |
| Running tests/builds | `Bash` agent | Логи могут быть большими |
| Multi-file edits | `general-purpose` | Каждый файл = контекст |

## Что делать самому (главный агент)

- Короткие точечные edits (1-2 файла)
- Прямой ответ на вопрос пользователя
- Планирование и TodoWrite
- Координация между subagents
- Финальная сборка результатов

## Паттерн параллельной делегации

```
# Запуск нескольких задач ОДНОВРЕМЕННО
Task(description="Task A", run_in_background=true, ...)
Task(description="Task B", run_in_background=true, ...)
Task(description="Task C", run_in_background=true, ...)

# Главный агент свободен:
# - Отвечать пользователю
# - Планировать следующие шаги
# - Запускать ещё tasks
```

## Anti-patterns (НЕ делай так)

```
# ПЛОХО: Главный агент делает exploration сам
Grep(...) → Read(...) → Grep(...) → Read(...)  # Контекст растёт!

# ПЛОХО: Главный агент делает browser automation
screenshot → click → screenshot → type → screenshot  # Ещё хуже!

# ПЛОХО: Последовательное выполнение независимых задач
Task A (wait) → Task B (wait) → Task C (wait)  # Медленно!
```

## Правильный workflow

```
User: "Настрой OAuth и протестируй auth"

Orchestrator думает:
1. Это 2 независимые задачи
2. Обе требуют browser automation
3. Запущу параллельно

Orchestrator делает:
Task("Setup OAuth", run_in_background=true)
Task("Test auth", run_in_background=true)

Orchestrator пользователю:
"Запустил 2 агента параллельно. Ожидаю результаты."

[Агенты работают, orchestrator свободен]

Orchestrator получает результаты → синтезирует → отвечает
```

## Когда НЕ делегировать

- Задача тривиальна (< 30 секунд работы)
- Нужен немедленный ответ пользователю
- Контекст уже в главном агенте и не требует exploration

## Метрика успеха

**Хороший orchestrator:**
- Контекст растёт медленно
- Много параллельных subagents
- Быстрые ответы пользователю
- Чистая координация

**Плохой orchestrator:**
- Контекст забит screenshots и file dumps
- Один последовательный поток работы
- Пользователь ждёт пока агент "исследует"
- Потеря контекста на середине задачи
