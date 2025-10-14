# ArbiBase Portal

This repository contains the ArbiBase customer portal built with Next.js 14. It exposes authenticated dashboards for property discovery, verification requests, and saved favorites backed by Supabase.

## Prerequisites
- Node.js 18 or later
- npm 9 or later (comes with Node.js)

## Installation
Install the dependencies once you have cloned the repository:

```bash
npm install
```

This will pull both runtime and development packages, including the TypeScript toolchain that Next.js expects during production builds.

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server on [http://localhost:3000](http://localhost:3000). |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Serve the production build locally. |
| `npm run lint` | Run Next.js linting. |
| `npm run vercel-build` | Build using the same step Vercel executes (`next build`). |

## Windows PowerShell quickstart
If you develop on Windows, you can install the dependencies from PowerShell with the following snippet executed in the project root:

```powershell
Set-Location -Path "C:\path\to\arbibase-portal"
npm install
```

If the build complains about missing TypeScript packages, install them explicitly:

```powershell
npm install --save-dev typescript @types/react @types/react-dom
```

## Deployment notes
- The app avoids remote font downloads so Vercel builds succeed without Google Fonts access.
- Ensure Supabase environment variables are configured (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Learn more
- [Next.js documentation](https://nextjs.org/docs)
- [Supabase documentation](https://supabase.com/docs)
