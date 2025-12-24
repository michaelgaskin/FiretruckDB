import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', cors());

// A. Querying
// GET /api/departments
app.get('/api/departments', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM departments ORDER BY name ASC'
    ).all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/departments
app.post('/api/departments', async (c) => {
  try {
    const { name } = await c.req.json();
    if (!name) return c.json({ error: 'Name is required' }, 400);

    const { success, meta } = await c.env.DB.prepare(
      'INSERT INTO departments (name) VALUES (?)'
    ).bind(name).run();

    if (success) {
      return c.json({ success: true, id: meta.last_row_id }, 201);
    } else {
      return c.json({ error: 'Failed to create department' }, 500);
    }
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/trucks
app.get('/api/trucks', async (c) => {
  try {
    const query = c.req.query();
    let sql = `SELECT trucks.*, departments.name as department_name 
       FROM trucks 
       LEFT JOIN departments ON trucks.department_id = departments.id`;

    const conditions: string[] = [];
    const params: any[] = [];

    // Global search string (searches across textual fields)
    if (query.q) {
      const search = `%${query.q}%`;
      conditions.push(`(
        trucks.name LIKE ? OR 
        trucks.chassis_mfg LIKE ? OR 
        trucks.body_mfg LIKE ? OR 
        trucks.aerial_mfg LIKE ? OR
        departments.name LIKE ?
      )`);
      params.push(search, search, search, search, search);
    }

    // Specific field filters
    if (query.year) {
      conditions.push('trucks.year = ?');
      params.push(query.year);
    }

    if (query.department_id) {
      conditions.push('trucks.department_id = ?');
      params.push(query.department_id);
    }

    if (query.chassis_mfg) {
      conditions.push('trucks.chassis_mfg LIKE ?');
      params.push(`%${query.chassis_mfg}%`);
    }

    if (query.pump_min) {
      conditions.push('trucks.pump_capacity >= ?');
      params.push(query.pump_min);
    }

    if (query.tank_min) {
      conditions.push('trucks.water_capacity >= ?');
      params.push(query.tank_min);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY trucks.created_at DESC';

    const { results } = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/trucks/:id
app.get('/api/trucks/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const truck = await c.env.DB.prepare(
      `SELECT trucks.*, departments.name as department_name 
       FROM trucks 
       LEFT JOIN departments ON trucks.department_id = departments.id 
       WHERE trucks.id = ?`
    ).bind(id).first();
    if (!truck) return c.json({ error: 'Truck not found' }, 404);

    const { results: images } = await c.env.DB.prepare(
      'SELECT * FROM truck_images WHERE truck_id = ?'
    ).bind(id).all();

    return c.json({ ...truck, images });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// B. Creation (Transactional)
// POST /api/trucks
app.post('/api/trucks', async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      department_id,
      year,
      chassis_mfg,
      body_mfg,
      aerial_mfg,
      pump_capacity,
      water_capacity,
      foam_a_capacity,
      foam_b_capacity,
      aerial_height,
      aerial_type,
    } = body;

    const { success, meta } = await c.env.DB.prepare(
      `INSERT INTO trucks (
        name, department_id,
        year, chassis_mfg, body_mfg, aerial_mfg,
        pump_capacity, water_capacity, foam_a_capacity, foam_b_capacity,
        aerial_height, aerial_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name || null, department_id || null,
      year, chassis_mfg, body_mfg, aerial_mfg,
      pump_capacity || 0, water_capacity || 0, foam_a_capacity || 0, foam_b_capacity || 0,
      aerial_height || 0, aerial_type
    ).run();

    if (success) {
      return c.json({ success: true, id: meta.last_row_id }, 201);
    } else {
      return c.json({ error: 'Failed to create truck' }, 500);
    }
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// C. Image Handling (R2 + D1)
// POST /api/trucks/:id/upload
app.post('/api/trucks/:id/upload', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (file instanceof File) {
      const filename = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;

      await c.env.BUCKET.put(filename, file.stream());

      // Assuming public access is enabled or using a custom domain for R2
      // For this example, we'll store the relative path or a placeholder URL
      // In a real scenario, you'd configure a custom domain or use a worker to serve images
      const imageUrl = `/images/${filename}`;

      await c.env.DB.prepare(
        'INSERT INTO truck_images (truck_id, image_url) VALUES (?, ?)'
      ).bind(id, imageUrl).run();

      return c.json({ success: true, url: imageUrl });
    } else {
      return c.json({ error: 'No file uploaded' }, 400);
    }
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Serve images from R2
app.get('/images/:key', async (c) => {
  const key = c.req.param('key');
  try {
    const object = await c.env.BUCKET.get(key);

    if (!object) {
      return c.text('Image not found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
      headers,
    });
  } catch (e) {
    return c.text('Error fetching image', 500);
  }
});

export default app;
