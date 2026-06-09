import { Redis } from '@upstash/redis';

// Find the Upstash REST credentials no matter what prefix Vercel applied.
// Handles KV_REST_API_URL, UPSTASH_REDIS_REST_URL, and prefixed names
// like kv_KV_REST_API_URL.
function findEnv(...candidates) {
  for (const name of candidates) {
    if (process.env[name]) return process.env[name];
  }
  const keys = Object.keys(process.env);
  for (const name of candidates) {
    const hit = keys.find((k) => k.endsWith(name) && process.env[k]);
    if (hit) return process.env[hit];
  }
  return undefined;
}

const url = findEnv('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'REST_API_URL');
const token = findEnv('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'REST_API_TOKEN');
const redis = url && token ? new Redis({ url, token }) : null;

const KEY = 'kickoff_comms';

export default async function handler(req, res) {
  if (!redis) {
    res.status(500).json({
      error: 'Storage not configured. In Vercel, connect an Upstash Redis database to this project and redeploy.'
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      const doc = await redis.get(KEY);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(doc || { data: null, updatedAt: 0 });
      return;
    }

    if (req.method === 'POST') {
      const secret = process.env.EDIT_SECRET;
      if (secret) {
        const provided = req.headers['x-edit-key'];
        if (provided !== secret) {
          res.status(401).json({ error: 'Invalid edit key' });
          return;
        }
      }

      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      if (!body || !body.data || !body.data.days) {
        res.status(400).json({ error: 'Missing or malformed data' });
        return;
      }

      const doc = {
        data: body.data,
        updatedAt: Date.now(),
        editor: String(body.editor || '').slice(0, 60)
      };
      await redis.set(KEY, doc);
      res.status(200).json(doc);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
