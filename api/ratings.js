import crypto from 'node:crypto';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown').trim();
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
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Database request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export default async function handler(request) {
  try {
    if (request.method === 'GET') {
      const data = await supabaseRpc('get_rating_summary');
      return json(200, data);
    }

    if (request.method !== 'POST') {
      return json(405, { error: 'Method not allowed.' });
    }

    const payload = await request.json().catch(() => null);
    const rating = Number(payload?.rating);
    const name = String(payload?.name || '').trim();
    const website = String(payload?.website || '').trim();

    if (website) return json(400, { error: 'Invalid submission.' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return json(400, { error: 'Please select a rating from 1 to 5 stars.' });
    }
    if (name.length > 80) return json(400, { error: 'Name must be 80 characters or fewer.' });

    const ipHash = hashIp(getClientIp(request));
    const data = await supabaseRpc('submit_rating', {
      p_rating: rating,
      p_name: name || null,
      p_ip_hash: ipHash
    });

    return json(200, data);
  } catch (error) {
    if (error?.code === '23505' || /duplicate|already rated/i.test(error?.message || '')) {
      return json(409, { error: 'A rating has already been submitted from this network today.' });
    }
    console.error('Ratings API error:', error);
    return json(500, { error: 'The rating service is temporarily unavailable.' });
  }
}
