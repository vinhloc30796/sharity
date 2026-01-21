# Claude Code Configuration

This directory contains Claude Code configuration and context files.

## Structure

```
.claude/
├── README.md         # This file
├── settings.json     # Claude Code settings (optional)
└── handoff/          # Task handoff files for context persistence
```

## Handoff Files

The `handoff/` directory stores context between Claude Code sessions:

- Task-specific context and progress
- Architecture decisions
- Bug investigation notes
- Migration plans

## Quick Start

When starting a new session, Claude Code will automatically read:

1. `../CLAUDE.md` — Project documentation and conventions
2. Files in `handoff/` if relevant to current task

## Convex + Clerk Project

This is a **Next.js 16 + Convex + Clerk** project:

```bash
# Terminal 1: Next.js
pnpm dev

# Terminal 2: Convex (required for backend)
pnpm convex:dev
# or: npx convex dev
```

## Key Files Reference

| What | Where |
|------|-------|
| Schema | `convex/schema.ts` |
| Backend functions | `convex/items.ts` |
| Auth config | `convex/auth.config.ts` |
| Root layout | `app/layout.tsx` |
| Main page | `app/page.tsx` |
| Item components | `components/item-*.tsx` |
| UI components | `components/ui/` |
