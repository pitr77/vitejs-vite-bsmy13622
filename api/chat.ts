import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Najprv spracuj preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Povolené len POST požiadavky
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // teraz až kontroluj POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages[]' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages,
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    const reply = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ reply });
  } catch (e: any) {
    return res.status(500).json({
      error: 'Proxy failed',
      details: String(e?.message || e),
    });
  }
}
