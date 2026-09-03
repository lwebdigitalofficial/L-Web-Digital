import crypto from 'node:crypto';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return (first || req.headers['x-real-ip'] || 'unknown').trim();
}

function hashIp(ip) {
  const salt = process.env.RATING_IP_SALT;
  if (!salt) throw new Error('RATING_IP_SALT is not configured');
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
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
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || data?.error || data?.hint || 'Database request failed';
    const error = new Error(String(message));
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await supabaseRpc('get_rating_summary');
      return json(res, 200, data);
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return json(res, 405, { error: 'Method not allowed.' });
    }

    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = null;
      }
    }
    if (!payload || typeof payload !== 'object') {
      return json(res, 400, { error: 'Invalid request body.' });
    }

    const rating = Number(payload.rating);
    const name = String(payload.name || '').trim();
    const website = String(payload.website || '').trim();

    if (website) return json(res, 400, { error: 'Invalid submission.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json(res, 400, { error: 'Please select a rating from 1 to 5 stars.' });
    }
    if (name.length > 80) {
      return json(res, 400, { error: 'Name must be 80 characters or fewer.' });
    }

    const ipHash = hashIp(getClientIp(req));
    const data = await supabaseRpc('submit_rating', {
      p_rating: rating,
      p_name: name || null,
      p_ip_hash: ipHash
    });

    return json(res, 200, data);
  } catch (error) {
    if (error?.code === '23505' || /duplicate|already rated/i.test(error?.message || '')) {
      return json(res, 409, { error: 'A rating has already been submitted from this network today.' });
    }

    console.error('Ratings API error:', error);
    return json(res, 500, { error: 'The rating service is temporarily unavailable.' });
  }
}
