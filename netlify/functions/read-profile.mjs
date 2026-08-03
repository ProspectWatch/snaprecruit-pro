export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY is not configured in Netlify.' }, 500);
  }

  try {
    const body = await req.json();
    const image = body?.image;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return json({ error: 'A base64 image data URL is required.' }, 400);
    }

    const prompt = `Read this Instagram profile screenshot carefully. Return ONLY valid JSON with exactly these keys:\n{\n  "instagram": "",\n  "full_name": "",\n  "snapchat": ""\n}\n\nRules:\n- instagram: the exact Instagram username shown in the top profile header. Preserve periods, underscores, and digits exactly. Do not infer or correct it.\n- full_name: the visible display name near the profile photo/header. Use normal capitalization. Do not use school, team, bio text, pronouns, class year, or suggested-account names. If no clear display name is visible, return an empty string.\n- snapchat: only return a handle explicitly written in the bio after SC, SC:, Snap, Snapchat, or a ghost emoji. Preserve punctuation exactly. Otherwise return an empty string.\n- Never invent a value. Never use follower names, highlighted stories, captions, or grid text.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: image, detail: 'high' }
          ]
        }],
        max_output_tokens: 300
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return json({ error: data?.error?.message || 'Vision reader request failed.' }, response.status);
    }

    const text = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text || '';
    const parsed = parseJson(text);
    return json({
      instagram: cleanHandle(parsed.instagram),
      full_name: cleanName(parsed.full_name),
      snapchat: cleanHandle(parsed.snapchat)
    });
  } catch (error) {
    return json({ error: error?.message || 'Unexpected reader error.' }, 500);
  }
};

export const config = { path: '/api/read-profile' };

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function parseJson(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

function cleanHandle(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
}

function cleanName(value) {
  return String(value || '').trim().replace(/\b(she\/her|he\/him|they\/them)\b/ig, '').replace(/\s+/g, ' ').replace(/^[\s._-]+|[\s._-]+$/g, '').slice(0, 60);
}
