---
trigger: always_on
---

## Technical Stack & Constraints
- **Framework:** Hono (v4+). Use the `hono/quick-new` or `hono/tiny` presets.
- **Runtime:** Cloudflare Workers (Workerd). **STRICTLY NO** Node.js APIs (e.g., `fs`, `path`, `process`).
- **Database:** Cloudflare D1 (SQLite). Use `drizzle-orm` or raw SQL if requested.
- **Storage:** Cloudflare R2.
- **Validation:** Use `@hono/zod-validator` for input validation.

## Coding Standards
1. **Environment Variables:** NEVER use `process.env`. ALWAYS access bindings via `c.env` (e.g., `c.env.MY_DB`).
2. **Type Safety:**
   - Always define a `Bindings` interface for the Hono app: `const app = new Hono<{ Bindings: Bindings }>()`.
   - When using D1, ensure types match the schema.
3. **R2 Handling:**
   - Use `await c.env.BUCKET.put()` and `await c.env.BUCKET.get()`.
   - Always handle `null` returns from R2 `.get()` calls (404s).
4. **Response Format:** Return JSON using `c.json({ data: ... })`. Handle errors with `c.json({ error: ... }, status)`.
5. **Testing:** Use `vitest` with `cloudflare:test` (workers-pool). Do not use Jest.