---
description: Steps to be followed for D1 schema changes
---

# Workflow: Cloudflare D1 Schema Evolution

**Context:** Use this workflow whenever I ask to modify the database schema, add a new table, or change a column.
**Tech Stack:** Hono, Drizzle ORM (assumed), Cloudflare D1, SQLite.

## Step 1: Modify Schema Definition
1.  Locate the schema definition file (usually `src/db/schema.ts` or similar).
2.  Implement the requested changes (e.g., `sqliteTable`, adding columns).
3.  **Constraint Check:** Ensure all types are SQLite-compatible (e.g., use `integer({ mode: 'boolean' })` for booleans).

## Step 2: Generate Migrations
1.  Run the Drizzle Kit command to generate the SQL migration file:
    ```bash
    npx drizzle-kit generate
    ```
    *(Or `npx wrangler d1 migrations create <DB_NAME> <message>` if using raw SQL)*
2.  Verify a new `.sql` file was created in the `drizzle` or `migrations` folder.

## Step 3: Apply to Local D1
1.  Apply the migration to the local development database:
    ```bash
    npx wrangler d1 migrations apply <DB_BINDING_NAME> --local
    ```
2.  **Verification:** If the command fails, analyze the error (often "table already exists" or syntax error) and fix the SQL file.

## Step 4: Sync TypeScript Interfaces
1.  If the project uses inferred types (e.g., `type User = InferSelectModel<typeof users>`), check that these types have updated automatically.
2.  If manual interfaces exist, update them to match the new schema.

## Step 5: Sanity Check
1.  Scan the `src` folder for any Hono route handlers that rely on the changed table.
2.  Update any `c.req.json()` validation (Zod schemas) to match the new database fields.