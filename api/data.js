import { Redis } from '@upstash/redis';

// The Vercel Marketplace Upstash integration injects credentials automatically.
// We accept either the KV_* names or the UPSTASH_* names so it works regardless of which it uses.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const KEY = 'kickoff_comms';

export default async function handler(req, res) {
  if (!redis) {
    res.status(500).json({
      error: 'Storage is not configured. In Vercel, add an Upstash Redis integration (Storage tab) and connect it to this project, then redeploy.'
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
      // Optional protection: set an EDIT_SECRET env var in Vercel to require a key for saving.
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
