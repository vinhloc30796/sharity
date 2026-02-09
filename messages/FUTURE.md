---
status: future
description: Proposed i18n refactoring to reduce duplication and improve maintainability. Not yet implemented.
---

## biggest maintenance leaks

* **dup keys across namespaces**: `Common.signIn` vs `AppHeader.signIn` etc.
* **semantic drift**: "request" means (a) borrow request (b) wishlist demand (c) pickup request. same english token, different product meanings.
* **ui-primitive duplication**: upload strings repeated in 3+ places (`clickToUpload`, `dragAndDrop`, `uploadLimit`)
* **status/action labels duplicated**: approve/reject/cancel/save/loading variants everywhere
* **pluralization hack**: `{s}` / `{es}` scattered. will hurt once you add vi (no plural).

## tighten it: 3 structural moves

### 1) introduce shared "atoms" + delete duplicates

create one section for common ui primitives and reference them everywhere.

* `ui.actions.{save,cancel,confirm,delete,edit,back,close,submit}`
* `ui.states.{loading,saving,submitting,connecting}`
* `ui.upload.{click,drag,limit,limitReached,addMore}`

then remove:

* `Common.*` **or** keep it but don't duplicate in `AppHeader`, `LeaseAction`, `Wishlist.draftCard`, etc.
* all repeated upload text blocks

### 2) rename keys by *intent*, not screen

screen-based namespaces rot. instead:

* keep screen namespaces for layout-only stuff
* move reusable copy into `domain.*` + `ui.*`

examples:

* `domain.lease.*` (borrow flow)
* `domain.demand.*` (wishlist / "đồ cần" flow)
* `domain.pickup.*`, `domain.return.*`

this prevents "request" collision.

### 3) kill english plural logic; use ICU or formatter

if you ever do vi, you want the string to not care about plural.
switch to either:

* ICU message format (`{count, plural, one {...} other {...}}`) for english
* or code-side helper: `tCount("pendingRequests", count)` that picks variant keys.

right now `{s}` / `{es}` will create gross bugs.

## concrete refactor suggestions from your file

### duplicate: sign in / profile (delete AppHeader versions)

* keep: `Common.signIn`, `Common.signUp`, `Common.profile`
* replace uses of `AppHeader.signIn|signUp|profile` with `Common.*`
* then remove `AppHeader` block entirely.

### duplicate: upload microcopy (centralize)

these appear in:

* `ItemForm`
* `LeaseAction`
* `Wishlist.draftCard`

create:

```json
"UI": {
  "upload": {
    "click": "Click to upload",
    "drag": "or drag and drop",
    "limit": "Up to {count} images",
    "limitFixed5": "Up to 5 images",
    "limitReached5": "Limit of 5 images reached. Remove some to add new ones."
  }
}
```

then in components: `t("UI.upload.click")`, etc.
also: prefer **one** of `limit` or `limitFixed5`, not both.

### semantic collision: “wishlist”

you have:

* `Home.seeFullWishlist`
* `Wishlist.title`, `Wishlist.emptyCard.seeFull`, `Wishlist.draftCard.success`

if you’re moving to “đồ cần / cần tìm”, rename key family now:

* `Demand.title`
* `Demand.subtitle`
* `Demand.actions.add`
* `Demand.actions.viewAll`
* `Demand.empty.*`
  don’t keep “Wishlist” as a namespace if the product concept changed.

### statuses duplicated in two places

* `MyItemCard.status.*`
* `LeaseClaim.status.*`
  they overlap but not identical; still, factor common statuses:
* `domain.lease.status.{requested,approved,rejected,picked_up,returned,expired,missing}`
  then “item” vs “lease” can alias:
* `domain.item.status.available` etc.

### action labels duplicated

`approve/reject/confirm/view/rate` appear in multiple blocks.
centralize in `UI.actions`.
domain-specific variants can be `UI.actions.approvePickup`, etc.

## “code-wise” mechanics: make reuse enforceable

if you’re on next-intl / i18next:

* add a lint rule: **no string literals in components** except debug
* add a script to detect duplicate values across keys (cheap win)
* require new copy to go through `UI.*` or `domain.*` first; screen namespaces only allowed for unique headings.

## quick wins (1 hour)

* delete `AppHeader` keys, point to `Common`
* create `UI.upload` and replace 3 places
* create `UI.actions` and replace 5–10 most repeated strings
* rename `Wishlist` namespace → `Demand` (even if english stays for now)

next test: paste the translation framework usage (next-intl? i18next? custom `t()`?), bc the best refactor depends on whether you can “alias” keys or you need to physically duplicate.
