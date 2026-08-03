exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Netlify.' }) };
  }

  try {
    const { image } = JSON.parse(event.body || '{}');
    if (!image || !image.startsWith('data:image/')) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'A valid image is required.' }) };
    }

    const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    if (!match) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unsupported image format.' }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: match[1], data: match[2] }
            },
            {
              type: 'text',
              text: `Read this Instagram profile screenshot carefully. Return ONLY valid JSON with exactly these keys:\n{\"instagram\":\"\",\"full_name\":\"\",\"snapchat\":\"\"}\n\nRules:\n- instagram: exact username shown in the top profile header. Do not use follower names, bio links, suggested accounts, or other visible handles.\n- full_name: exact display name beside or below the profile picture. Remove pronouns only. Do not infer from the username and do not use school, team, class year, or bio text.\n- snapchat: only an explicit Snapchat username in the bio immediately following SC, SC:, Snap, Snap:, Snapchat, Snapchat:, or a ghost emoji. Otherwise return an empty string.\n- Preserve periods, underscores, hyphens, letters, and digits exactly.\n- If uncertain, return an empty string for that field instead of guessing.`
            }
          ]
        }]
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || `Anthropic API error (${response.status})`;
      return { statusCode: response.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: message }) };
    }

    const text = (payload.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n').trim();
    const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    let result;
    try {
      result = JSON.parse(jsonText);
    } catch {
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!objectMatch) throw new Error('Claude returned an unreadable response.');
      result = JSON.parse(objectMatch[0]);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        instagram: String(result.instagram || '').trim(),
        full_name: String(result.full_name || '').trim(),
        snapchat: String(result.snapchat || '').trim()
      })
    };
  } catch (error) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message || 'Reader failed.' }) };
  }
};