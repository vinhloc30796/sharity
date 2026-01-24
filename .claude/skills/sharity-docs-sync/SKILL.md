---
name: sharity-docs-sync
description: Sync Sharity project documentation from Notion, Miro, and Figma to Obsidian vault for offline access.
---

# Sharity Documentation Sync

Синхронизация документации проекта Sharity из внешних источников в Obsidian.

## Obsidian Location

```
/Users/dmitrysurkov/Library/Mobile Documents/iCloud~md~obsidian/Documents/Main/02-Projects/Sharity/
```

## Folder Structure

```
02-Projects/Sharity/
├── README.md           # Обзор проекта, ссылки
├── Migration-Plan.md   # (уже существует)
├── Notion/             # Страницы из Notion
│   ├── index.md        # Главная страница
│   └── *.md            # Подстраницы
├── Design/             # Figma дизайн
│   └── index.md        # Ссылки и описания фреймов
└── Architecture/       # Miro схемы
    └── index.md        # Ссылки и описания досок
```

## External Sources

| Source | URL | API |
|--------|-----|-----|
| Notion | https://www.notion.so/Sharity-Dalat-Build-Week-2e60a5be7bbe80e68b23f1f5f158aaee | Integration Token |
| Miro | https://miro.com/app/board/uXjVGPKWI70=/ | REST API |
| Figma | https://figma.com/design/S74LV4AyyLLK7L2G5Y211m/Sharity?node-id=2004-4099 | Personal Access Token |

## Workflow

### При запросе документации

1. **Проверить кэш** — есть ли документация в Obsidian
2. **Если есть и свежая (< 7 дней)** — показать из Obsidian
3. **Если нет или устарела** — синхронизировать и показать

### Команды

```bash
# Синхронизировать всё
python scripts/sync_docs.py --all

# Только Notion
python scripts/sync_docs.py --notion

# Только Miro
python scripts/sync_docs.py --miro

# Только Figma
python scripts/sync_docs.py --figma

# Принудительное обновление
python scripts/sync_docs.py --all --force

# Показать статус кэша
python scripts/sync_docs.py --status
```

## Environment Variables

Создать `.env` файл в корне проекта:

```env
# Notion
NOTION_TOKEN=secret_xxx...

# Miro
MIRO_ACCESS_TOKEN=xxx...

# Figma
FIGMA_ACCESS_TOKEN=figd_xxx...
```

**ВАЖНО**: `.env` добавлен в `.gitignore`, не коммитить токены!

## API Setup

### Notion

1. Перейти на https://www.notion.so/my-integrations
2. Создать новую интеграцию
3. Скопировать Internal Integration Token
4. В Notion открыть страницу → Share → Invite integration

### Miro

1. Перейти на https://miro.com/app/settings/user-profile/apps
2. Create new app или использовать существующий
3. Скопировать Access token

### Figma

1. Перейти в Settings → Account → Personal access tokens
2. Generate new token
3. Скопировать токен

## File Format

Синхронизированные файлы содержат YAML frontmatter:

```markdown
---
source: notion|miro|figma
source_url: https://...
source_id: "page_id"
title: "Page Title"
synced_at: 2026-01-22T15:30:00
---

# Page Title

Content...

---
_Synced: 2026-01-22 15:30_
_Source: [Notion](https://...)_
```

## Decision Logic

### Когда использовать кэш

- Пользователь спрашивает о документации (`"что в notion?"`, `"покажи дизайн"`)
- Файл существует в Obsidian
- Не прошло 7 дней с последней синхронизации

### Когда обновлять

- Пользователь явно просит (`"обнови документацию"`, `"синхронизируй"`)
- Файл отсутствует в Obsidian
- Прошло больше 7 дней с последней синхронизации
- Флаг `--force`

## Quick Reference

| Действие | Команда |
|----------|---------|
| Синхронизировать всё | `python scripts/sync_docs.py --all` |
| Только Notion | `python scripts/sync_docs.py --notion` |
| Статус кэша | `python scripts/sync_docs.py --status` |
| Обновить принудительно | `python scripts/sync_docs.py --all --force` |

## Obsidian Links

Из других заметок можно ссылаться:

```markdown
[[02-Projects/Sharity/Notion/index|Sharity Notion]]
[[02-Projects/Sharity/Design/index|Sharity Design]]
[[02-Projects/Sharity/Architecture/index|Sharity Architecture]]
```

## Troubleshooting

### Ошибка авторизации Notion

- Проверить, что интеграция добавлена на страницу (Share → Invite)
- Проверить токен в `.env`

### Ошибка Miro/Figma

- Проверить токены в `.env`
- Убедиться, что доска/файл доступны

### Файлы не появляются в Obsidian

- iCloud синхронизация может занять время
- Проверить путь к vault
