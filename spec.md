Project Specification: Fire Truck CRUD App (Cloudflare Native)
1. System Overview
Goal: Build a high-performance, low-maintenance web application to catalog fire apparatus (fire trucks). Purpose: Serve as a modern architectural replacement for legacy 1990s HTML-table based sites. Key Quality Attributes:

Zero-Maintenance: Must run on serverless infrastructure (no VPS management).

Speed: fast load times for list views and search.

Scalability: Separate metadata (SQL) from binary assets (Images).

2. Technology Stack (Strict)
The agent must use the following specific technologies. No substitutions allowed.

Runtime: Cloudflare Workers.

Language: TypeScript.

Framework: Hono (v4+).

Database: Cloudflare D1 (SQLite).

File Storage: Cloudflare R2 (Object Storage).

Frontend Hosting: Cloudflare Workers Static Assets (via [assets] binding).

Frontend Framework: Vanilla HTML/CSS/JS (No React/Vue/Angular build steps).

Styling: Simple CSS (or a lightweight class-less framework like Pico.css if needed).

3. Data Architecture (Schema)
Units: Imperial (Gallons, Feet, GPM).

The agent must use this exact SQL schema for D1.

SQL

-- schema.sql
DROP TABLE IF EXISTS trucks;
DROP TABLE IF EXISTS truck_images;

-- 1. Main Entity: Trucks
CREATE TABLE trucks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER, -- Placeholder for future logic
  
  -- Core Identity
  year INTEGER NOT NULL,
  chassis_mfg TEXT NOT NULL, -- e.g., "Seagrave", "Pierce"
  body_mfg TEXT,             -- Nullable if same as chassis
  aerial_mfg TEXT,           -- Nullable if same as chassis
  
  -- Specifications (Imperial Units)
  pump_capacity INTEGER DEFAULT 0,    -- Unit: GPM
  water_capacity INTEGER DEFAULT 0,   -- Unit: Gallons
  foam_a_capacity INTEGER DEFAULT 0,  -- Unit: Gallons
  foam_b_capacity INTEGER DEFAULT 0,  -- Unit: Gallons
  
  -- Aerial Device Specs
  aerial_height INTEGER DEFAULT 0,    -- Unit: Feet
  aerial_type TEXT,                   -- e.g., "Rear Mount Platform"
  
  created_at INTEGER DEFAULT (unixepoch())
);

-- 2. Media Entity: Images
CREATE TABLE truck_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  truck_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,        -- Full Public R2 URL or Relative Path
  caption TEXT,
  uploaded_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE
);
4. Directory Structure
The agent should scaffold the project using this structure:

Plaintext

/
├── wrangler.toml        # Cloudflare configuration
├── package.json         # Dependencies (hono, wrangler)
├── schema.sql           # Database definition
├── src/
│   └── index.ts         # Main Worker entry point (Hono app)
└── public/              # Static Assets (Frontend)
    ├── index.html       # Main list view
    ├── admin.html       # Add/Edit form
    ├── style.css        # Global styles
    └── app.js           # Frontend logic
5. API Specification (Hono Backend)
The backend (src/index.ts) must expose the following JSON endpoints:

A. Querying
GET /api/trucks

Logic: Select all trucks, ordered by created_at DESC.

Response: JSON array of truck objects.

GET /api/trucks/:id

Logic: Select single truck + fetch associated images from truck_images.

B. Creation (Transactional)
POST /api/trucks

Body: JSON object matching the trucks table columns.

Logic: Insert into D1. Return { success: true, id: <new_id> }.

C. Image Handling (R2 + D1)
POST /api/trucks/:id/upload

Body: FormData containing a file field.

Logic:

Generate a unique filename (e.g., UUID.jpg).

await env.BUCKET.put(filename, file_stream).

Insert record into truck_images table with the resulting URL.

Response: { success: true, url: ... }.

6. Frontend Requirements
Index Page (index.html):

Fetch list from /api/trucks on load.

Render a simple grid or table of trucks.

Display "Year / Chassis / Pump / Tank" clearly.

Admin Page (admin.html):

A simple HTML form to input truck specs.

After successful submission, show an "Upload Photos" section to POST images to the new truck ID.

7. Implementation Checklist for Agent
Initialize: Check for wrangler.toml configuration (ensure [assets] and [[d1_databases]] are defined).

Schema: Run wrangler d1 execute --file=./schema.sql (mock this command if in simulation).

Backend: Write src/index.ts implementing the Hono API.

Frontend: Write public/index.html and public/app.js to consume the API.

Verify: Ensure env.DB and env.BUCKET are typed correctly in TypeScript interfaces.