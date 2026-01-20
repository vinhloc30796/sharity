This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Toolchain

- [Next.js](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Convex](https://convex.dev)
- [pnpm](https://pnpm.io)

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Roadmap

- [x] Givers should be able to submit an item
- [ ] Givers should be able to approve or reject a getter's claim
    - there should be a queue of 5 claimer (this should be a server-side config, not exposed to users)
    - this should affect status badge of the item: avail, waitlist open, waitlist closed, exchanged
- [ ] Givers should be able to block a spammer from claiming an item (or all items)
- [x] Getters should be able to browse items aimlessly (for discovery)
- [ ] Getters should be able to search for specific items
    - [ ] by location
    - [ ] by time
    - [~] by keywords
    - [ ] by availability
    - [ ] by deposit/no deposit
    - [ ] by owner (default to exclude all items submitted by current logged in user)
- [ ] Getters should be able to claim an item
- [ ] Givers & getters should be able to mark an item as exchanged & hide it from the market
- [ ] Givers should be able to set a (optional) deposit amount for an item
- ...
    
## Deployment

This repo is connected to https://sharity-dalat.vercel.app with auto-deployments on changes to `main` branch.`