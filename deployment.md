# Deployment Guide for FiretruckDB

This guide outlines the steps to deploy the FiretruckDB application to Cloudflare using Wrangler.

## Prerequisites

- [Node.js](https://nodejs.org/) installed.
- [Cloudflare Account](https://dash.cloudflare.com/sign-up).
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`npx wrangler login`).

## Deployment Steps

### 1. Install Dependencies

Run the following command in the project root to install the necessary dependencies:

```bash
npm install
```

### 2. Create D1 Database

Create a new D1 database on Cloudflare:

```bash
npx wrangler d1 create firetruck-db
```

Copy the `database_id` from the output and update the `wrangler.toml` file:

```toml
[[d1_databases]]
binding = "DB"
database_name = "firetruck-db"
database_id = "YOUR_DATABASE_ID_HERE" # <--- Paste ID here
```

### 3. Create R2 Bucket

Create a new R2 bucket for storing images:

```bash
npx wrangler r2 bucket create firetruck-images
```

Ensure the bucket name in `wrangler.toml` matches:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "firetruck-images"
```

### 4. Apply Database Schema

Initialize the database tables by running the schema file:

```bash
npx wrangler d1 execute firetruck-db --file=./schema.sql
```

For local development testing, you can use `--local`:
```bash
npx wrangler d1 execute firetruck-db --file=./schema.sql --local
```

### 5. Deploy to Cloudflare Workers

Deploy the application (backend and frontend assets):

```bash
npx wrangler deploy
```

Wrangler will output the URL of your deployed Worker (e.g., `https://firetruck-db.your-subdomain.workers.dev`).

### 6. Configure R2 Public Access (Optional)

If you want images to be publicly accessible directly via R2 (not strictly required if you proxy through the worker, but the current implementation assumes public URLs or relative paths served by the worker), you may need to configure the R2 bucket for public access or connect a custom domain in the Cloudflare Dashboard.

*Note: The current implementation stores a relative path `/images/<filename>`. For this to work perfectly, you might need to add a route in `src/index.ts` to serve these images from the bucket if you aren't using a custom domain for the bucket itself.*

## Local Development

To run the application locally:

```bash
npm run dev
```

This will start a local server, usually at `http://localhost:8787`.
