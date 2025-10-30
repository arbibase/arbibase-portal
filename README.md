This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
+# ArbiBase Portal
 
-## Getting Started
+This repository contains the ArbiBase customer portal built with Next.js 14. It exposes authenticated dashboards for property discovery, verification requests, and saved favorites backed by Supabase.
 
-First, run the development server:
+## Prerequisites
+- Node.js 18 or later
+- npm 9 or later (comes with Node.js)
+
+## Installation
+Install the dependencies once you have cloned the repository:
 
 ```bash
-npm run dev
-# or
-yarn dev
-# or
-pnpm dev
-# or
-bun dev
+npm install
 ```
 
-Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
-
-You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
+This will pull both runtime and development packages, including the TypeScript toolchain that Next.js expects during production builds.
 
-This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
+## Useful Scripts
 
-## Learn More
+| Command | Description |
+| --- | --- |
+| `npm run dev` | Start the local development server on [http://localhost:3000](http://localhost:3000). |
+| `npm run build` | Create an optimized production build. |
+| `npm run start` | Serve the production build locally. |
+| `npm run lint` | Run Next.js linting. |
+| `npm run vercel-build` | Build using the same step Vercel executes (`next build`). |
 
-To learn more about Next.js, take a look at the following resources:
+## Windows PowerShell quickstart
+If you develop on Windows, you can install the dependencies from PowerShell with the following snippet executed in the project root:
 
-- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
+```powershell
+Set-Location -Path "C:\path\to\arbibase-portal"
+npm install
+```
 
-You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
+If the build complains about missing TypeScript packages, install them explicitly:
 
-## Deploy on Vercel
+```powershell
+npm install --save-dev typescript @types/react @types/react-dom
+```
 
-The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
+## Deployment notes
+- The app avoids remote font downloads so Vercel builds succeed without Google Fonts access.
+- Ensure Supabase environment variables are configured (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 
-Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
+## Learn more
+- [Next.js documentation](https://nextjs.org/docs)
+- [Supabase documentation](https://supabase.com/docs)

```
arbibase-portal
├─ eslint.config.mjs
├─ middleware.ts
├─ next-env.d.ts
├─ next.config.mjs
├─ package.json
├─ postcss.config.js
├─ public
│  ├─ arbibase-logo.svg
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ src
│  ├─ app
│  │  ├─ (app)
│  │  │  ├─ dashboard
│  │  │  │  └─ page.tsx
│  │  │  ├─ favorites
│  │  │  │  └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ lease-assistant
│  │  │  │  └─ page.tsx
│  │  │  ├─ market-radar
│  │  │  │  └─ page.tsx
│  │  │  ├─ portfolio
│  │  │  │  └─ page.tsx
│  │  │  ├─ properties
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [id]
│  │  │  │     ├─ page.tsx
│  │  │  │     └─ PropertyDetailClient.tsx
│  │  │  ├─ request-verification
│  │  │  │  └─ page.tsx
│  │  │  └─ requests
│  │  │     └─ page.tsx
│  │  ├─ account
│  │  │  └─ page.tsx
│  │  ├─ admin
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx
│  │  │  └─ tiers
│  │  │     └─ page.tsx
│  │  ├─ api
│  │  │  ├─ admin
│  │  │  │  ├─ promote
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ send-invite
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ tiers
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ users
│  │  │  │     └─ [id]
│  │  │  │        ├─ delete
│  │  │  │        │  └─ route.ts
│  │  │  │        └─ suspend
│  │  │  │           └─ route.ts
│  │  │  ├─ debug
│  │  │  │  └─ me
│  │  │  │     └─ route.ts
│  │  │  ├─ geocode
│  │  │  │  └─ route.ts
│  │  │  ├─ integrations
│  │  │  │  └─ sheets
│  │  │  │     └─ pull
│  │  │  │        └─ route.ts
│  │  │  ├─ market-radar
│  │  │  │  └─ route.ts
│  │  │  ├─ roi[id]
│  │  │  │  └─ route.ts
│  │  │  ├─ search
│  │  │  │  └─ route.ts
│  │  │  └─ settings
│  │  │     └─ digest
│  │  │        └─ route.ts
│  │  ├─ contact
│  │  │  └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ login
│  │  │  └─ page.tsx
│  │  └─ page.tsx
│  ├─ components
│  │  ├─ AppShell.tsx
│  │  ├─ Aurora.tsx
│  │  ├─ comp-analysis.tsx
│  │  ├─ Header.tsx
│  │  ├─ MarketRadar.tsx
│  │  ├─ PortalHero.tsx
│  │  ├─ ProtectedRoute.tsx
│  │  ├─ roi-calculator.tsx
│  │  ├─ RoiDrawer.tsx
│  │  ├─ SpotlightCarousel.tsx
│  │  └─ ui
│  │     ├─ MapPane.tsx
│  │     ├─ PropertyCard.tsx
│  │     ├─ PropertyDetailClient.tsx
│  │     ├─ PropertyModal.tsx
│  │     ├─ SearchBar.tsx
│  │     ├─ Sidebar.tsx
│  │     └─ Topbar.tsx
│  ├─ emails
│  │  └─ dealDigest.tsx
│  ├─ lib
│  │  ├─ getServerUser.ts
│  │  ├─ integrations.ts
│  │  ├─ lead-scoring.ts
│  │  ├─ properties-demo.ts
│  │  ├─ supabase.ts
│  │  ├─ supabaseAdmin.ts
│  │  └─ useTier.ts
│  ├─ middleware.ts
│  ├─ pages
│  │  └─ api
│  │     ├─ ghl.ts
│  │     └─ ping.ts
│  ├─ styles
│  │  └─ tokens.css
│  └─ types
│     ├─ google-maps.d.ts
│     └─ roi.ts
├─ supabase
│  └─ migrations
│     └─ 20250101000000_create_user_profiles.sql
├─ tailwind.config.js
├─ tsconfig.json
└─ vercel.json

```