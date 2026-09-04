import crypto from 'node:crypto';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

function hashVisitor(visitorId) {
  const salt = process.env.RATING_IP_SALT;
  if (!salt) throw new Error('RATING_IP_SALT is not configured');
  return crypto.createHash('sha256').update(`${salt}:view:${visitorId}`).digest('hex');
}

async function supabaseRpc(name, body = {}) {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL is not configured');

  const response = await fetch(`${base.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

  if (!response.ok) {
    const message = data?.message || data?.error || data?.hint || 'Database request failed';
    throw new Error(String(message));
  }
  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await supabaseRpc('get_view_summary');
      return json(res, 200, data);
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed.' });
    }

    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = null; }
    }

    if (!payload || typeof payload !== 'object') {
      return json(res, 400, { error: 'Invalid request body.' });
    }

    const viewType = String(payload.viewType || '').trim();
    const visitorId = String(payload.visitorId || '').trim();

    if (!['website', 'portfolio'].includes(viewType)) {
      return json(res, 400, { error: 'Invalid view type.' });
    }
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(visitorId)) {
      return json(res, 400, { error: 'Invalid visitor token.' });
    }

    const visitorHash = hashVisitor(visitorId);
    const data = await supabaseRpc('record_view', {
      p_view_type: viewType,
      p_visitor_hash: visitorHash
    });

    return json(res, 200, data);
  } catch (error) {
    console.error('Views API error:', error);
    return json(res, 500, { error: 'The views service is temporarily unavailable.' });
  }
}
