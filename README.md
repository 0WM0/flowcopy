# FlowCopy

FlowCopy is a Next.js app for authoring and reviewing UX microcopy flows.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Feedback Modal → Supabase Setup

The inspector panel includes a **Send Feedback** button (purple) that opens a modal with:

- Feedback type: `User Interface` / `Tool functionality` / `Other`
- Optional email
- Long text feedback field

Submissions are sent to `POST /api/feedback`, which writes to Supabase using the REST API.

### 1) Environment Variables

Add the following to your `.env.local`:

```bash
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
# Optional: defaults to feedback_submissions
SUPABASE_FEEDBACK_TABLE=feedback_submissions
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to the browser.

### 2) Create Table in Supabase

Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  feedback_type text not null check (feedback_type in ('user_interface', 'tool_functionality', 'other')),
  email text null,
  message text not null,
  account_id text null,
  account_code text null,
  project_id text null,
  project_name text null,
  user_agent text null
);
```

If you set `SUPABASE_FEEDBACK_TABLE` to a different name, create that table instead.

### 3) Verify

1. Open any project in the editor.
2. In the inspector, click **Send Feedback**.
3. Submit a message.
4. Confirm row insertion in your Supabase table.

