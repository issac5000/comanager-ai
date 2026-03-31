# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (flat config, no args needed)
npm run start    # Start production server
```

No test framework is configured.

## Architecture

**CoManager AI** is a social media management platform with AI-powered content generation and comment handling for Facebook and Instagram. Built with **Next.js 16 App Router**, **Supabase** (PostgreSQL + Auth + Storage), **TypeScript**, **Tailwind CSS 4**, and **shadcn/ui**.

### Route Groups

- `src/app/(auth)/` — Login, register pages. Redirects to `/dashboard` if already authenticated.
- `src/app/(dashboard)/` — Protected pages behind auth + org membership. Shared layout with sidebar (`src/components/dashboard/sidebar.tsx`).
- `src/app/onboarding/` — First-time org creation flow. Users without an org get redirected here.

### Auth & Middleware Flow

`src/middleware.ts` → `src/lib/supabase/middleware.ts`: Every request checks Supabase session. Unauthenticated users are redirected to `/login`. Authenticated users without an `organization_members` row are redirected to `/onboarding`. Auth pages redirect logged-in users to `/dashboard`.

### Supabase Client Variants (important)

- `src/lib/supabase/client.ts` — Browser client (anon key, RLS enforced). Use in client components.
- `src/lib/supabase/server.ts` — Server client (anon key + cookies). Use in server components and API routes that need user context.
- `src/lib/supabase/service.ts` — Service role client (**bypasses RLS**). Only for webhooks and background jobs where no user session exists.

### Data Model

All data is scoped to organizations. Key relationships:
- `organizations` ← `organization_members` (user_id, role)
- `organizations` ← `connected_accounts` (Facebook pages + Instagram accounts with access tokens)
- `organizations` ← `posts` → `post_types`, `media`
- `organizations` ← `comments` → `posts`
- `organizations` ← `editorial_mix` → `post_types`
- `organizations` ← `publication_settings` (1:1)
- `organizations` → `industries` (default hashtags, tone)

TypeScript types are auto-generated: `src/lib/types/database.ts`. Use `Tables<"table_name">` for row types.

### API Routes

| Route | Purpose |
|---|---|
| `api/posts/generate` | AI caption (DeepSeek) + image (Gemini) generation |
| `api/meta/connect` | Initiate Meta OAuth flow |
| `api/meta/callback` | OAuth callback → save accounts + subscribe webhooks |
| `api/meta/disconnect` | Remove connected account |
| `api/meta/publish` | Publish post to Facebook/Instagram |
| `api/meta/webhook` | Receive Meta webhook events (comments) |
| `api/meta/reply` | Send reply to a Facebook/Instagram comment |
| `api/meta/subscribe-webhooks` | Re-subscribe page to webhooks |
| `api/meta/fetch-comments` | Fetch comments from Meta API |

### External Service Integrations

- **Meta Graph API v22.0** (`src/lib/meta/api.ts`): OAuth, page management, publishing (Facebook photos, Instagram container-based flow), webhook subscriptions, comment replies.
- **DeepSeek** (`src/lib/ai/deepseek.ts`): Caption generation (temp 0.8) and comment reply generation (temp 1.0). All prompts are in French. Returns JSON for captions, plain text for replies. "IGNORE" response = spam.
- **Google Gemini** (`src/lib/ai/gemini.ts`): Image generation. Uses `buildImagePrompt()` to construct prompts from post context. Returns base64 PNG.

### Post Lifecycle

`generating` → `pending_review` → `approved`/`rejected` → `published`/`failed`

Post generation (`api/posts/generate`): creates post row as `generating`, calls DeepSeek for caption+hashtags, calls Gemini for image, uploads image to Supabase Storage, updates to `pending_review`.

### Comment Reply Flow

Meta webhook → `api/meta/webhook` receives comment → finds matching `connected_account` by page_id/ig_user_id → fetches org context → DeepSeek generates reply → stores in `comments` table with `reply_status: "pending_review"` → user reviews in UI → `api/meta/reply` posts to Meta and sets `reply_status: "published"`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
META_APP_ID
META_APP_SECRET
META_CONFIG_ID
META_WEBHOOK_VERIFY_TOKEN
DEEPSEEK_API_KEY
GEMINI_API_KEY
```

## Conventions

- All AI prompts and UI text are in **French**.
- Path alias: `@/*` → `./src/*`.
- UI components use shadcn/ui (`src/components/ui/`). Add new ones with `npx shadcn@latest add <component>`.
- Icons from `lucide-react`.
- Toast notifications via `sonner`.
- Next.js 16 has breaking changes vs prior versions — check `node_modules/next/dist/docs/` before using unfamiliar APIs.
