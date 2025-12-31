---
description: Workflow for adding a new R2 upload endpoint
---

# Workflow: R2 File Upload Implementation

**Context:** Use this workflow when I ask to create a file upload endpoint.
**Tech Stack:** Hono, Cloudflare Workers, R2 Storage.

## Step 1: Route Scaffolding
1.  Create a new `PUT` route (e.g., `app.put('/upload/:filename', ...)`).
2.  Ensure the route has access to `c.env.MY_BUCKET` (replace with actual binding name from `wrangler.toml`).

## Step 2: Input Validation & Safety
1.  **Check Headers:** Add logic to check `Content-Length`. Reject requests larger than 10MB (or standard limit) immediately to save Worker CPU.
    ```ts
    const size = c.req.header('content-length');
    if (size && parseInt(size) > 10 * 1024 * 1024) return c.text('Too large', 413);
    ```
2.  **File Type:** Check `Content-Type` header against allowed MIME types.

## Step 3: R2 Write Operation
1.  Parse the body. For simple binary uploads, use `arrayBuffer`:
    ```ts
    const body = await c.req.arrayBuffer();
    ```
2.  Perform the `put` operation. **Crucial:** Pass the `httpMetadata` so the file is served with the correct type later.
    ```ts
    await c.env.MY_BUCKET.put(filename, body, {
      httpMetadata: { contentType: c.req.header('content-type') }
    });
    ```

## Step 4: Response & Error Handling
1.  Wrap the R2 operation in a `try/catch` block.
2.  On success, return the object key and a public URL (if public access is enabled).
3.  On error, return a 500 status with a JSON error message.

## Step 5: Testing (Curl)
1.  Generate a curl command I can copy-paste to test this endpoint:
    ```bash
    curl -X PUT --data-binary "@./test-image.png" -H "Content-Type: image/png" http://localhost:8787/upload/my-image.png
    ```