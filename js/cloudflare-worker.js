// ═══════════════════════════════════════════════
//  Nexus Gist Proxy — Cloudflare Worker
//  Deploy at: workers.cloudflare.com (free)
//  Token never touches your public GitHub repo.
// ═══════════════════════════════════════════════

const GIST_ID    = '915bc7aef3d7130aa2044ba311089dc3';
const GIST_FILE  = 'nexus.json';
// ↓ Paste your ghp_ token here — this file stays only in Cloudflare
const GIST_TOKEN = 'PASTE_YOUR_TOKEN_HERE';

const GIST_API   = `https://api.github.com/gists/${GIST_ID}`;
const ALLOWED_ORIGIN = 'https://k-r-dhanush.github.io'; // your GitHub Pages URL

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    const origin = request.headers.get('Origin') || '';
    // Only allow requests from your GitHub Pages site
    if (!origin.startsWith('https://k-r-dhanush.github.io') &&
        !origin.startsWith('http://localhost') &&
        !origin.startsWith('http://127.0.0.1')) {
      return new Response('Forbidden', { status: 403 });
    }

    const gistHeaders = {
      'Accept':               'application/vnd.github+json',
      'Authorization':        `Bearer ${GIST_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent':           'Nexus-App',
      'Content-Type':         'application/json'
    };

    try {
      if (request.method === 'GET') {
        // Read from Gist
        const res  = await fetch(GIST_API, { headers: gistHeaders });
        if (!res.ok) throw new Error(`Gist read failed: ${res.status}`);
        const json = await res.json();
        const raw  = json.files?.[GIST_FILE]?.content;
        if (!raw) throw new Error('nexus.json not found in Gist');
        const data = JSON.parse(raw);
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
        });

      } else if (request.method === 'PUT') {
        // Write to Gist
        const body = await request.json();
        const res  = await fetch(GIST_API, {
          method:  'PATCH',
          headers: gistHeaders,
          body:    JSON.stringify({
            files: { [GIST_FILE]: { content: JSON.stringify(body, null, 2) } }
          })
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Gist write failed: ${res.status} — ${err}`);
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
        });

      } else {
        return new Response('Method not allowed', { status: 405 });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
      });
    }
  }
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400'
  };
}
