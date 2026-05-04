# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # development server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
npm run start    # production server (after build)
```

No test suite is configured.

## Architecture

**SeshatIA** is a freemium micro-SaaS for generating commercial proposals in PDF via AI. Built with Next.js 16 App Router.

### Request flow

1. **Landing** (`app/page.tsx`) — single-page with inline auth modal (no separate login route). On login, redirects via `window.location.href = '/dashboard'`.
2. **Middleware** (`middleware.ts`) — protects `/dashboard/**`; unauthenticated users are redirected to `/`.
3. **Dashboard** (`app/dashboard/page.tsx`) — thin shell: validates session client-side, then renders `<PropostaIA user={user} />`.
4. **Main component** (`app/proposta-ia.tsx`) — all dashboard logic lives here: form, PDF generation, proposal archive, upgrade modal.

### API routes

| Route | Purpose |
|---|---|
| `POST /api/gerar-proposta` | Generates proposal via OpenAI GPT-4o-mini; requires auth session; saves to `propostas` table |
| `POST /api/stripe/checkout` | Creates Stripe checkout session (subscription mode) |
| `POST /api/stripe/webhook` | Handles Stripe events; updates `profiles` table via service role key |
| `POST /api/stripe/portal` | Creates Stripe billing portal session for existing subscribers |

### Supabase

Two Supabase client patterns — keep them distinct:
- **Server** (`app/lib/supabase/server.ts`) — uses `next/headers` cookies; used in Route Handlers and middleware.
- **Browser** (`app/lib/supabase/clientes.ts`) — uses `createBrowserClient`; used in Client Components. Components instantiate it directly with `useMemo` rather than importing from this file.

**Tables:**
- `propostas` — `id, user_id, nome_cliente, descricao, proposta_texto, created_at`
- `profiles` — `id, is_premium, stripe_customer_id, stripe_subscription_id, subscription_status`

### Freemium model

`FREE_LIMIT = 3` in `proposta-ia.tsx`. Free-tier PDFs render a diagonal "VERSÃO GRATUITA" watermark. Premium status comes from `profiles.is_premium`, set by the Stripe webhook on `checkout.session.completed`.

### PDF generation

`downloadPDF()` in `proposta-ia.tsx` uses jsPDF directly (no server-side rendering). Two themes:
- **Branco Minimalista** — light background (`#EEEEE6`), dark header bar
- **Preto Premium** — dark background (`#0D0B0A`), amber left stripe on content pages

Proposal text is parsed line-by-line; section titles are detected with `/^\d+\.\s/` and styled differently.

### Design system

All colors are hardcoded constants, not Tailwind tokens:
- `AMBER = '#F59E0B'` — primary accent used everywhere
- `BG / C.bg = '#0C0A09'` — main background
- Tailwind v4 is used for layout/spacing; per-element colors are applied via inline `style` props.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # webhook + portal routes only
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_PRICE_ID                # the subscription price ID in Stripe
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL            # e.g. https://seshat.app (fallback: http://localhost:3000)
```
