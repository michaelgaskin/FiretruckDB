-- schema.sql
DROP TABLE IF EXISTS trucks;
DROP TABLE IF EXISTS truck_images;

-- 1. Main Entity: Trucks
-- 1. Organization Entity: Departments
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- 2. Main Entity: Trucks
CREATE TABLE trucks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER,
  
  -- Core Identity
  name TEXT,                 -- e.g., "Engine 1", "Ladder 3"
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
  
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
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
