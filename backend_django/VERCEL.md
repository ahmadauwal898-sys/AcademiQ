# AcademiQ — Vercel Deployment & Service Routing Guide

This repository is configured to deploy directly to **Vercel** with full service routing connecting the **Vite React Frontend** and the **Django Backend Engine**.

---

## 1. Architecture on Vercel

```
                        [ Internet User ]
                                │
                                ▼
                        [ Vercel Edge Router ]
                                │
          ┌─────────────────────┴─────────────────────┐
          │                                           │
          ▼                                           ▼
  Requests to `/(.*)`                     Requests to `/api/(.*)`
          │                                           │
          ▼                                           ▼
  [ Static Build (dist) ]                   [ Vercel Serverless Function ]
  Vite 6 + React 19 + PWA                   `api/index.py` -> Django WSGI
  • Instant global CDN caching              • Django REST Framework
  • Offline Service Worker (`/sw.js`)       • PostgreSQL connection pooling
  • Web App Manifest (`/manifest.json`)     • Tenant isolation & verification
```

---

## 2. Deployment Steps on Vercel

### Option A: 1-Click Vercel Git Import (Standard)

1. Push your AcademiQ repository to **GitHub / GitLab / Bitbucket**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import the AcademiQ repository.
4. Vercel will automatically detect `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Configure your Environment Variables in the Vercel Dashboard (see section below).
6. Click **Deploy**.

---

## 3. Environment Variables for Vercel

In **Vercel Project Settings > Environment Variables**, configure:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SECRET_KEY` | Django Cryptographic Key | `generate-a-64-character-hex-key` |
| `DATABASE_URL` | Production PostgreSQL connection string | `postgres://user:password@host:5432/dbname` |
| `DEBUG` | Django Debug Mode | `False` |
| `ALLOWED_HOSTS` | Vercel domain and custom domains | `.vercel.app,academiq.pro,localhost` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend domains | `https://your-project.vercel.app` |

*Note: If `DATABASE_URL` is not provided, the Django engine runs with an ephemeral SQLite database for demonstration, but PostgreSQL (Supabase, Neon, AWS RDS, or Cloud SQL) is recommended for permanent multi-tenant production.*

---

## 4. Service Routing Details (`vercel.json`)

The included `vercel.json` ensures:
1. **Frontend Assets**: All static HTML/JS/CSS bundled by Vite are served from `dist/` with edge caching.
2. **Backend API**: All requests starting with `/api/` route to `api/index.py` which loads the Django WSGI application.
3. **PWA Standalone Headers**:
   - `/sw.js` is served with `Content-Type: application/javascript; charset=utf-8` and `Service-Worker-Allowed: /`.
   - `/manifest.webmanifest` and `/manifest.json` are served with `Content-Type: application/manifest+json; charset=utf-8`.
4. **Single-Page Application (SPA)**: All unmapped URL routes fallback to `/index.html` for client-side routing.

---

## 5. Local Development vs Vercel Production

- **Local Preview / AI Studio Environment**: Runs full-stack with Express + Vite middleware + SQLite on port 3000 (`npm run dev`).
- **Vercel Production Deployment**: Vite builds into `dist/`, and Django handles API endpoints through Vercel Serverless Functions.
