# RSPP DVR Suite

Gestionale DVR web app in **single file HTML**, veloce da distribuire e pronto per uso operativo:
frontend vanilla + backend Supabase + login Microsoft.

## Perche funziona bene
- **Zero framework:** UI in `index.html` (HTML/CSS/JS puro).
- **Backend solido:** Supabase (Postgres, Auth, Storage, RLS).
- **Accesso enterprise:** Microsoft/Azure OAuth via Supabase Auth.
- **Sicurezza reale:** ruoli (`viewer`, `editor`, `rspp`, `admin`) + policy RLS.

## Architettura
- `index.html` - SPA completa (navigazione, CRUD, filtri, modali, auth).
- `supabase/schema.sql` - schema DB, enum, FK, trigger.
- `supabase/auth.sql` - sync automatica utenti (`auth.users` -> `public.profiles`).
- `supabase/functions.sql` - RPC business (associazioni, calcoli rischio).
- `supabase/seed.sql` - cataloghi iniziali.
- `supabase/policies.sql` - policy RLS.
- `supabase/storage.sql` - bucket e policy storage.
- `.env.example` - variabili runtime richieste.

## Quick Start
1. Crea un progetto Supabase.
2. Esegui gli script SQL in ordine:
   1. `supabase/schema.sql`
   2. `supabase/auth.sql`
   3. `supabase/functions.sql`
   4. `supabase/seed.sql`
   5. `supabase/policies.sql`
   6. `supabase/storage.sql`
3. Abilita Microsoft provider in Supabase:
   - `Authentication -> Providers -> Azure (Microsoft)`
   - imposta `Client ID` e `Client Secret`
   - in Azure registra il callback Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Promuovi almeno un utente interno in `public.profiles` (`admin` o `rspp`).

## Config Frontend
Compila `.env` in root:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Genera `env.js`:

```bash
python scripts/generate_env_js.py
```

L'app legge i valori runtime da `window.__ENV`.

## Deploy (GitHub Pages / static hosting)
Funziona bene anche su hosting statico da repo privata.

Checklist minima:
- imposta variabili ambiente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`);
- genera `env.js` in build/deploy;
- in Supabase `Authentication -> URL Configuration`:
  - `Site URL` = URL produzione (es. GitHub Pages),
  - `Additional Redirect URLs` include anche `.../index.html`.

