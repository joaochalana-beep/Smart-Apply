# ApplyWise Domain & Email Setup Checklist

This file tracks everything needed to go from **mock email mode** to **real `@applywise.site` emails**.

## Current state

- Domain reserved: `applywise.site`
- Email provider: [Resend](https://resend.com)
- Sending status: `MOCK` (see `lib/config.ts` → `emailSendingEnabled: false`)
- Inbound email webhook: built at `/api/webhooks/email`
- Clerk signup webhook: built at `/api/webhooks/clerk`

---

## 1. Verify `applywise.site` domain

- [ ] Buy/transfer `applywise.site` if not already owned
- [ ] Add DNS records in your registrar:
  - Resend will give you **SPF**, **DKIM**, and **DMARC** records
  - Clerk will give you a **CNAME** or DNS record for the webhook endpoint (if using a custom domain, not required for webhooks)
- [ ] Wait for DNS propagation (usually 5–60 minutes)
- [ ] In Resend dashboard, verify the domain

## 2. Resend configuration

- [ ] Create a Resend account: https://resend.com
- [ ] Generate an API key
- [ ] Add to `.env.local`:
  ```env
  RESEND_API_KEY=re_xxxxxxxx
  FROM_EMAIL=ApplyWise <applications@applywise.site>
  ```
- [ ] Verify `applications@applywise.site` and `no-reply@applywise.site` as sender addresses
- [ ] Enable inbound email routing in Resend:
  - Set the **inbound domain** to `applywise.site`
  - Set the webhook URL to:
    ```
    https://applywise.site/api/webhooks/email?token=YOUR_WEBHOOK_SECRET
    ```
  - Choose **JSON** payload format

## 3. Clerk webhook configuration

- [ ] In Clerk Dashboard → Webhooks, add an endpoint:
  - URL: `https://applywise.site/api/webhooks/clerk`
  - Events: `user.created`
- [ ] Copy the **Signing Secret** and add to `.env.local`:
  ```env
  CLERK_WEBHOOK_SECRET=whsec_xxxxxxxx
  ```
- [ ] This webhook auto-creates a Supabase profile and `@applywise.site` email immediately on signup

## 4. Environment variables

Make sure `.env.local` contains:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Resend
RESEND_API_KEY=re_...
FROM_EMAIL=ApplyWise <applications@applywise.site>
WEBHOOK_SECRET=your-random-secret-here

# Public URL
NEXT_PUBLIC_APP_URL=https://applywise.site
```

## 5. Supabase migrations

Run the migrations in order:

```bash
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_profile_email_columns.sql
supabase/migrations/003_update_messages_schema.sql
supabase/migrations/004_add_job_company_fields.sql
supabase/migrations/005_add_application_reference.sql
```

## 6. Enable real email sending

Once the domain is verified and the API key is set, flip the flag in `lib/config.ts`:

```ts
emailSendingEnabled: true,
```

Or set an environment variable and update the config to read it:

```ts
emailSendingEnabled: process.env.EMAIL_SENDING_ENABLED === "true",
```

## 7. Test the full flow

1. Sign up a new user
2. Check that a profile with `applywise_email` is created in Supabase
3. Apply to a job
4. Check the application email is sent (not mocked) in Resend dashboard
5. Reply to the application email from a test account
6. Verify the reply appears in `/inbox` as a `company_reply`

## 8. Security notes

- The inbound email webhook at `/api/webhooks/email` checks `?token=WEBHOOK_SECRET`
- The Clerk webhook verifies the Svix signature using `CLERK_WEBHOOK_SECRET`
- Keep all secrets in `.env.local` and never commit them

## 9. Optional: custom reply addresses

If you want each user to receive replies at their own `@applywise.site` address (e.g. `joao.chalana@applywise.site`), configure Resend inbound routing to catch all `*@applywise.site` and forward to the webhook.

---

Last updated: 2026-06-21
