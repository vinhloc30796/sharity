# UI Improvement Proposal: Card Action Buttons

**Branch:** `ui/card-actions-improvements`
**Date:** 2026-01-24
**Component:** `MyItemCard` (`components/my-item-card.tsx`)

---

## Problem Statement

The current "My Items" card design has UX issues with Edit and Delete buttons:

1. **Red Delete button is too prominent** — draws attention to destructive action
2. **Text buttons occupy too much space** — visual clutter in compact cards
3. **Delete is too accessible** — violates UX friction principle for destructive actions

---

## Before

![Before](./screenshots/before-card-actions.png)

**Issues:**
- "Edit" button with outline style
- "Delete" button in bright red (`variant="destructive"`)
- Both buttons always visible, competing for attention
- Red color draws eye away from positive actions (Review, Claim)

---

## After

![After](./screenshots/after-card-actions.png)

**Improvements:**
- Icon buttons instead of text (Pencil, Trash2)
- Neutral gray color by default (`text-muted-foreground`)
- Delete turns red only on hover (`hover:text-red-600 hover:bg-red-50`)
- Smaller footprint, cleaner look
- Confirmation dialog preserved for safety

---

## Hover States

| Icon | Default | Hover |
|------|---------|-------|
| Edit (Pencil) | Gray | Dark gray |
| Delete (Trash) | Gray | Red with light red background |

---

## UX Rationale

Based on industry best practices:

### 1. De-emphasize Destructive Actions
> "Destructive actions should introduce friction to make the user pause before continuing."
> — [Design Systems Collective](https://www.designsystemscollective.com/designing-better-buttons-how-to-handle-destructive-actions-d7c55eef6bdf)

### 2. Icon Buttons for Secondary Actions
> "If you have more than two supplemental actions, Material Design recommends using an overflow menu to keep the card clean and uncluttered."
> — [UX Planet](https://uxplanet.org/button-ux-design-best-practices-types-and-states-647cf4ae0fc6)

### 3. Progressive Disclosure
Red color appears only when user intends to delete (hover), not constantly demanding attention.

---

## Code Changes

```tsx
// Before
<Button variant="outline" size="sm">Edit</Button>
<Button variant="destructive" size="sm">Delete</Button>

// After
<Button variant="ghost" size="icon"
  className="h-8 w-8 text-muted-foreground hover:text-foreground">
  <Pencil className="h-4 w-4" />
</Button>

<Button variant="ghost" size="icon"
  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50">
  <Trash2 className="h-4 w-4" />
</Button>
```

---

## Accessibility

- `sr-only` labels preserved for screen readers
- Sufficient color contrast maintained
- Icon size (16px) meets touch target guidelines with 32px button size
- Confirmation dialog provides additional safety net

---

## Recommendation

**Approve this change** — it aligns with:
- Modern UI patterns (Google, Apple, Microsoft use icon actions)
- Figma design (shows icons in card corners)
- UX best practices for destructive actions
