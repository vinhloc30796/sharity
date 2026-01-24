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

### 🎁 Giving & Managing Items
- [x] Submit an item for sharing
- [~] Manage owned items:
    - [x] View pending and approved requests
    - [x] Set unavailability periods (calendar blocking)
    - [ ] Set a fixed rental price (optional, cannot be changed once set)
    - [ ] Set a deposit amount (optional)
- [x] Approve or reject claims:
    - [x] Manage queue of claimants (limit to 5)
    - [x] Provide rejection reasons (optional)
- [ ] Block specific users from claiming items

### 🔍 Finding & Requesting Items
- [x] Browse items for discovery
- [~] Search for items:
    - [x] By location
    - [ ] By keyword [~]
    - [ ] By availability time
    - [ ] By deposit/price requirements
    - [ ] By owner (exclude own items)
- [x] Claim/Request an item:
    - [x] Specify pick-up time
    - [x] Specify return time
    - [ ] Request non-existent items (wishlist)

### 🤝 Exchange & Trust
- [ ] Mark items as exchanged (hides from market)
- [ ] Status badges for items (Available, Waitlist Open/Closed, Exchanged)
    
## Deployment

This repo is connected to https://sharity-dalat.vercel.app with auto-deployments on changes to `main` branch.`